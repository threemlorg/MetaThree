//import { isNumeric } from 'jquery';
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r123/three.module.js';
import { GLTFLoader } from './controls/GLTFLoader.js';
import { CSS3DObject, CSS3DRenderer } from './renderers/CSS3DRenderer.js';
import { DefaultFont } from './fonts/defaultfont.js'
import { VRButton } from './controls/VRButton.js';
import { GUI } from './controls/dat.gui.module.js';
import { FlyControls } from './controls/FlyControls.js';
import { OrbitControls } from './controls/OrbitControls.js';
import { Reflector } from './controls/Reflector.js';
import { Water } from './controls/Water.js';
import { THREEx } from './controls/threex.dynamictexture.js';
import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
import GerstnerWater from './controls/gerstnerWater.js'
import { Fire } from './controls/Fire.js';

var ThreeScenes = []
var camera;
var scene;
var rendererCSS;
var renderer;
var mixer = null;
var clock = new THREE.Clock();
var controls;
var socket;

var ThreeML = function (element) {
	const loader = new GLTFLoader();
	const defaultFont = new DefaultFont();
	var defaultLookat;
	var navigating;
	var orbitControls;
	var previousNavigation;
	var scenes = [];
	const cameraMaxXangleDef = 0.3;
	const cameraMaxYangleDef = 0.5;
	var cameraMaxXangle = cameraMaxXangleDef;
	var cameraMaxYangle = cameraMaxYangleDef;
	var self = this;
	let gui;
	this.getThreeScene = function () {
		if (ThreeScenes.length > 0) {
			return ThreeScenes[0];
		}
	}
	var externalModules = [];
	this.registerModule = function (module) {
		externalModules.push(module);
	}
	function createGUI() {

		if (gui) {
			try {
				gui.destroy();
			}
			catch (x) { }

		}

		gui = new GUI({ width: 350 });
	}

	window.addEventListener('resize', onWindowResize, false);
	document.onmousemove = handleMouseMove;
	var selectedObject;

	this.getScene = function () {
		return scene;
	}
	this.getCamera = function () {
		return camera;
	}
	this.getRenderer = function () {
		return renderer;
	}
	this.getRendererCss = function () {
		return rendererCSS;
	}

	this.show = function (objectName, doShow = true) {
		for (var n = 0; n < scenes.length; n++) {
			var scene = scenes[n];
			var object = scene.getObjectByName(objectName);
			doShowObject(object, doShow);
		}
	}
	function doShowObject(object, doShow) {
		if (object) {
			object.visible = doShow;
			//			var disp = doShow ? '' : 'none';
			for (var n = 0; n < object.children.length; n++) {
				doShowObject(object.children[n], doShow);
			}


		}
	}
	this.toggle = function (objectName) {
		for (var n = 0; n < scenes.length; n++) {
			var scene = scenes[n];
			var object = scene.getObjectByName(objectName);
			var show = !object.visible;
			if (object) {
				doShowObject(object, show);

			}
		}
	}
	this.showFromGroup = function (groupName, objectName) {
		for (var n = 0; n < scenes.length; n++) {
			var scene = scenes[n];
			var group = scene.getObjectByName(groupName);
			if (group) {
				for (var m = 0; m < group.children.length; m++) {
					var object = group.children[m];
					doShowObject(object, object.name == objectName);
				}
			}
		}
	}
	this.present = function (objectName, doPresent = undefined) {
		var obj = scene.getObjectByName(objectName);
		if (obj && obj.present) {
			if (!doPresent) {
				if (obj.presentProp) {
					//doPresent = !obj.presentProp.isPresenting
				}
				else {
					doPresent = true;
				}
			}
			obj.present(doPresent);
		}
	}
	this.presentFromGroup = function (groupName, objectName) {
		for (var n = 0; n < scenes.length; n++) {
			var scene = scenes[n];
			var group = scene.getObjectByName(groupName);
			if (group) {
				for (var m = 0; m < group.children.length; m++) {
					var obj = group.children[m];
					if (obj.present) {
						obj.present(obj.name == objectName);
					}
				}
			}
		}
	}
	this.clearChildren = function (objName) {
		var group = scene.getObjectByName(objName);
		if (group) {
			for (var n = 0; n < group.children.length; n++) {

				doClearChildren(group.children[n]);
			}

		}
	}

	function doClearChildren(obj) {
		if (obj) {
			for (var n = 0; n < obj.children.length; n++) {
				clearCh(obj.children[n]);
			}

		}
	}
	function clearCh(obj) {
		if (obj) {
			for (var n = 0; n < obj.children.length; n++) {
				clearCh(obj.children[n]);
			}
			if (obj.geometry) {
				obj.geometry.dispose();
			}
			var p = obj.parent;
			p.remove(obj);
		}
	}
	this.clearGoupChildren = function (objName) {
		var group = scene.getObjectByName(objName);
		doClearGoupChildren(group);
	}
	function doClearGoupChildren(group) {
		while (group.children.length > 0) {
			doClearGoupChildren(group.children[0]);
			group.remove(group.children[0]);
		}
	}
	this.loadCodeInGroup = function (groupName, code, replace = true) {
		var group = scene.getObjectByName(groupName);
		var domgroup = document.getElementsByName(groupName);
		if (group && domgroup) {
			domgroup[0].innerHTML = code;
			var threeScene = ThreeScenes[0];
			if (replace) {
				doClearGoupChildren(group);
			}
			threeScene.parseChildren(domgroup[0], group);
		}
	}
	this.loadInTarget = function (targetName, url, replace = true) {
		return this.loadInGroup(targetName, url, replace);
	}
	this.loadInGroup = function (targetName, url, replace = true) { //Deprecated: use loadInTarget()
		var group = scene.getObjectByName(targetName);
		var domgroup = document.getElementsByName(targetName);
		if (group && domgroup) {
			if (domgroup.length === 2 && domgroup[1].localName === "iframe") {
				domgroup[1].src = url;
			}
			else {
				let xhr = new XMLHttpRequest();
				xhr.open('get', url);
				xhr.send();
				xhr.onload = function () {
					if (xhr.status != 200) { // analyze HTTP status of the response
						alert(`Error ${xhr.status}: ${xhr.statusText}`); // e.g. 404: Not Found
					} else { // show the result
						var r = xhr.response;
						domgroup[0].innerHTML = r;
						var threeScene = ThreeScenes[0];
						if (replace) {
							doClearGoupChildren(group);
						}
						threeScene.parseChildren(domgroup[0], group);
					}
				};
				xhr.onerror = function () {
					alert("Request failed");
				};
			}
		}
	}

	this.getAttributes = function(ele) {
		var att = {};
		if (ele && ele.attributes) {
			for (var n = 0; n < ele.attributes.length; n++) {
				var name = ele.attributes[n].nodeName;
				var val = ele.attributes[n].nodeValue;
				att[name.toLowerCase()] = val;
			}
		}
		return att;
	}

	//////////////////////////////////////////
	//Global event handling
	//var raycaster = new THREE.Raycaster();
	//var mouse = new THREE.Vector2();
	var mousePos;
	var lastMousePos;
	var allObjects = [];
	var avatarheight = 1.7;
	var rayCastDirection;
	//var cameraTarget;

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		rendererCSS.setSize(window.innerWidth, window.innerHeight);
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	function getPoint(obj) {
		if (obj.point) {
			return obj.point;
		}
		return getPointFromChildren(obj);
	}
	function getPointFromChildren(obj) {

		for (var n = 0; n < obj.children.length; n++) {
			if (obj.children[n].point) {
				return obj.children[n].point;
			}
			var point = getPointFromChildren(obj.children[n]);
			if (point) {
				return point;
			}
		}
	}
	var mouseDown = false;
	var mousedownpoint;
	function onMouseDown(event) {
		event.stopPropagation();
		//mousedownpoint=undefined;
		selectedObject = getRayCastedObject();
		hideIframe(selectedObject);
		mouseDown = true;
		var p;
		if (selectedObject && selectedObject.point) {
			p = selectedObject.point;
			mousedownpoint=p;
		}
		else if (mouseDirection&& cursor3d && !cursor3d.visible) {
			var l = cursor3d.position.distanceTo(camera.position);
			p = mouseDirection.normalize().clone().multiplyScalar(l);
			
			if (p) {
				cursor3d.position.set(p.x, p.y, p.z);

			}
			cursor3d.visible = true;
		}
		
	}
	function onMouseUp(event) {
		mouseDown = false;
		if (selectedObject) {
			hideIframe(selectedObject, true);

			if (selectedObject.eventParent) {
				selectedObject = selectedObject.eventParent;
			}
			if (selectedObject.presentProp && !selectedObject.presentProp.isPresenting) {
				selectedObject.presentProp.defaultPosition = selectedObject.position.clone();
			}
		}
		else if (navigating == CameraMode.CLICK && rayCastDirection) {
			cameraTarget = camera.position.clone().add(rayCastDirection.multiplyScalar(100));
		}
		selectedObject = undefined;
		lastMousePos = undefined;
		if (cursor3d) {
			cursor3d.visible = false;
		}

	}
	function hideIframe(selectedObject, show = false) {
		if (selectedObject) {
			var p = selectedObject.eventParent;
			if (p && p.children && p.children.length > 0) {
				var css3d = p.children[0];
				if (css3d.element && css3d.element.children && css3d.element.children.length > 1) {
					var ifr = css3d.element.children[1];
					if (ifr.localName == 'iframe') {
						ifr.style.display = show ? 'block' : 'none';
					}
				}
			}
		}
	}
	function getOrbitTarget(point){
		var orbitTarget=new THREE.Vector3(point.x, point.y + avatarheight, point.z);
		var direction=orbitTarget.clone().sub(camera.getWorldPosition(new THREE.Vector3())).clone();
		direction.normalize();
		orbitTarget.add(direction);
		return orbitTarget;
	} 

	function onDocumentMouseClick(event) {
		var intersected = getRayCastedObject();
		if (intersected) {
			if (intersected.eventParent) {
				intersected = intersected.eventParent;
			}
			if (intersected.callback) {
				event.preventDefault();
				intersected.callback('click');
			}
			else if (intersected.walk ) {

				var point = getPoint(intersected)
				if (!point ) { return; }
				if(mousedownpoint && mousedownpoint.distanceTo(point)>0.1){console.log(mousedownpoint.distanceTo(point)); return;}
				var orbitTarget=null;
				if(orbitControls){
					orbitTarget=getOrbitTarget(point);
				}
				self.moveToPosition(camera, point.x, point.y + avatarheight, point.z, orbitTarget.x, orbitTarget.y, orbitTarget.z)
			}
		}
	}
	this.moveToPosition = function (obj, x, y, z, targetx, targety, targetz, speed = 0.01) {
		checkObjectUpdateArray(obj);
		if (!obj.targetPosition && obj.targetPosition != '') {
			var f = function () {

				if (obj.targetPosition && obj.targetPosition != '') {
					obj.targetStep--;
					if (obj.position.distanceTo(obj.targetPosition) < 0.1 || obj.targetStep<0) {
						//camera.position.set(camera.targetPosition.clone());
						obj.targetPosition = '';
						obj.orbitTarget=undefined;
					}
					else {
						obj.position.lerp(obj.targetPosition, speed);
						if(orbitControls && obj.orbitTarget){
							orbitControls.target.lerp(obj.orbitTarget.clone(), speed);
						}
					}
				}
			}
			obj.updateArray.push(f);
		}
		obj.orbitTarget=new THREE.Vector3(targetx, targety, targetz);

		obj.targetPosition = new THREE.Vector3(x, y, z);
		//var le = obj.position.clone().sub(obj.targetPosition).length() / 20;
		//le = le < 0.2 ? 0.1 : le;
		//obj.targetLimit = le ;
		obj.targetStep = Math.floor(2 / speed);
	}
	this.getCameraDefaultLookAtDummy = function() {
		var geometry = new THREE.BoxBufferGeometry();
		var material = new THREE.MeshPhongMaterial();
		var la = new THREE.Mesh(geometry, material);
		la.scale.copy(new THREE.Vector3(0.01, 0.01, 0.01));
		la.visible = false;
		scene.add(la)
		var vec = new THREE.Vector3(0, 0, -2);
		vec.applyQuaternion(camera.quaternion);
		la.position.copy(vec)
		return la;
    }
	var targetLookAt;
	this.lookAtPosition = function (x, y, z, speed = 0.01) {
		checkObjectUpdateArray(camera);
		if (!targetLookAt) {
			//targetLookAt = self.getCameraDefaultLookAtDummy();
			targetLookAt =getOrbitTarget(point);
			//camera.lookAt(camera.targetLookAt);
			// var f = function () {
			// 	if (targetLookAt) {// && camera.targetLookAtCnt && camera.targetLookAtCnt >0 ) {
			// 		//camera.targetLookAtCnt--;
			// 		//rotateCameraToObject(targetLookAt.position)
			// 		var v = new THREE.Vector3(x, y, z);
			// 		if (navigating == CameraMode.ORBIT && orbitControls) {
			// 			orbitControls.target.copy(targetLookAt.position.clone());
			// 			var d = v.distanceTo(targetLookAt.position);
			// 			if (d< 0.1) {
			// 				//targetLookAt = undefined;
			// 				return false;
			// 			}
			// 		}
			// 	}
			// }
			// camera.updateArray.push(f);
		}
		self.moveToPosition(targetLookAt, x, y, z, targetLookAt.x, targetLookAt.y, targetLookAt.z, speed);
	}

	function rotateCameraToObject(position, t) {
		var object3Ds = new THREE.Object3D();
		// set dummyObject's position, rotation and quaternion the same as the camera
		object3Ds.position.copy(position);
		var targetQuaternion = getTargetQuaternionForSlerp(object3Ds);
		camera.quaternion.slerp(targetQuaternion, t);
	}

	function getTargetQuaternionForSlerp(target) {
		var cameraPosition = camera.position.clone();               // camera original position
		var cameraRotation = camera.rotation.clone();               // camera original rotation
		var cameraQuaternion = camera.quaternion.clone();           // camera original quaternion
		var dummyObject = new THREE.Object3D();
		// set dummyObject's position, rotation and quaternion the same as the camera
		dummyObject.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
		dummyObject.rotation.set(cameraRotation.x, cameraRotation.y, cameraRotation.z);
		dummyObject.quaternion.set(cameraQuaternion.x, cameraQuaternion.y, cameraQuaternion.z);
		// lookAt object3D
		dummyObject.lookAt(target);
		// store its quaternion in a variable
		return dummyObject.quaternion.clone();
	}



	function checkObjectUpdateArray(obj) {
		if (!obj.updateArray) {
			obj.updateArray = [];
			obj.update = function (delta) {
				for (var n = 0; n < obj.updateArray.length; n++) {
					obj.updateArray[n].call(obj, delta);
				}
			}
		}
	}
	function getMousePos(event) {
		event = event || window.event; // IE-ism
		var lmousePos = {
			x: event.clientX,
			y: event.clientY
		};
		return lmousePos;
	}
	function handleMouseMove(event) {
		//var dot, eventDoc, doc, body, pageX, pageY;
		event.stopPropagation();
		if (!camera) { return; }
		mousePos = getMousePos(event)
		if ((selectedObject || (cursor3d && cursor3d.visible)) && lastMousePos) {
			var divx = lastMousePos.x - mousePos.x;
			var divy = lastMousePos.y - mousePos.y;
			mouseDivX = -0.01 * divx;
			mouseDivY = 0.01 * divy;
		}
		if (selectedObject && selectedObject.position && lastMousePos && (selectedObject.draggable || (selectedObject.eventParent && selectedObject.eventParent.draggable))) {

			if (selectedObject.eventParent) {
				selectedObject.eventParent.position.x += mouseDivX;
				selectedObject.eventParent.position.y += mouseDivY;
			}
			else {
				selectedObject.position.x += mouseDivX;
				selectedObject.position.y += mouseDivY;
			}
		}
		if (cursor3d && cursor3d.visible) {
			cursor3d.position.x += mouseDivX;
			if (ctrlKey) {
				cursor3d.position.z -= mouseDivY;
			}
			else {
				cursor3d.position.y += mouseDivY;
			}
		}
		lastMousePos = mousePos;
		check3dLinkForCursor();
	}
	var ctrlKey = false;
	var mouseDivX = 0;
	var mouseDivY = 0;
	var cursor3d;
	function getTheMousePos() {
		var mouse = new THREE.Vector2();
		if (mousePos) {
			mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
			mouse.y = - (mousePos.y / window.innerHeight) * 2 + 1;
		}
		return mouse;

	}
	var mouseDirection;
	function getRayCastedObject() {
		var raycaster = new THREE.Raycaster();
		var mouse = getTheMousePos();
		raycaster.setFromCamera(mouse, camera);
		mouseDirection = raycaster.ray.direction;
		var intersects = raycaster.intersectObjects(allObjects);
		rayCastDirection = raycaster.ray.direction;
		if (intersects.length > 0 && intersects[0].object) {
			intersects[0].object.point = intersects[0].point;
			return intersects[0].object;
		}
	}


	function fillAllObjects() {
		allObjects = [];
		scene.traverse(function (child) { allObjects.push(child); });
	}
	var hoverObject;
	function check3dLinkForCursor() {
		var intersected = getRayCastedObject();
		var c = 'default';
		if (intersected) {
			if (intersected.eventParent) {
				intersected = intersected.eventParent;
			}
			if (intersected.present || intersected.callback) {

				c = 'pointer';
			}
			else if (intersected.walk) {
				c = 'url(/steps.cur),auto';
			}
			if (intersected.callback) {
				intersected.callback('hover');
			}
		}
		document.body.style.cursor = c;
		if (hoverObject && hoverObject.o != intersected) {
			clearHover();
		}
	}
	function clearHover(container) {
		if (hoverObject && hoverObject.o) {
			var a = hoverObject.o.hoveractions;
			if (hoverObject.t) {
				hoverObject.t.visible = false;
			}
			if (hoverObject.o.defaultScale) {
				hoverObject.o.scale.set(hoverObject.o.defaultScale.x, hoverObject.o.defaultScale.y, hoverObject.o.defaultScale.z);
				hoverObject.o.scaled = false;
			}
			if (hoverObject.o.defaultColor) {
				hoverObject.o.material.color = hoverObject.o.defaultColor;
				hoverObject.o.colored = false;
			}
			var hd = assureHoverDiv(container);
			if (hd) {
				hd.style.display = 'none';
			}
			hoverObject = undefined;

		}
	}
	//////////////////////////////////////////
	function assureHoverDiv(container) {
		var hd = document.getElementById('hoverdiv');
		if (!hd && container) {
			hd = document.createElement('div');
			hd.id = 'hoverdiv';
			hd.style.backgroundColor = 'white';
			hd.style.position = 'absolute';
			hd.style.top = '0';
			hd.style.padding = '2px';
			hd.classList.add('hoverdiv');
			container.append(hd);
		}
		return hd;
	}

	function CheckZoom() {
		let zoom = ((window.outerWidth - 10) / window.innerWidth) * 100;
		if (zoom < 95 || zoom > 105) {
			showWarning('Please set the zoom of your browser to 100% and then reload this page. Otherwise some ThreeML functions might not work correctly');
		}
	}
	function showWarning(text) {
		var d = document.createElement('div');
		d.style.position = 'absolute';
		d.style.display = 'block';
		d.style.fontSize = '30px';
		d.style.zindex = 10000;
		d.style.color = 'white';
		d.style.left = '100px';
		d.style.top = '100px';
		d.style.backgroundColor = 'black';
		d.style.padding = '20px';
		d.style.width = '80vw';
		var bt = document.createElement('div');
		bt.innerHTML = 'X';
		bt.style.float = 'right';
		bt.style.cursor = 'pointer';
		bt.style.fontFamily = 'Arial';
		bt.style.fontSize = 'small';
		bt.style.border = 'solid 1pt';
		bt.style.padding = '2px';
		bt.addEventListener('click', function () {
			this.parentElement.style.display = 'none';
		})
		d.appendChild(bt);
		var p = document.createElement('div');
		p.innerText = text;
		d.appendChild(p);
		var ad = document.createElement('div');
		ad.style.marginTop = '30px';
		var a = document.createElement('a');
		a.href = "javascript:location.reload(true/false);";
		a.innerText = "Refresh page";
		ad.appendChild(a);
		d.appendChild(ad);
		document.body.appendChild(d);
    }


	this.setCommonAttributes = function(obj, att) {
		if (att.position) {
			var v = toV(att.position)
			obj.position.set(v.x, v.y, v.z);
		}
		if (att.translation) {
			var v = toV(att.translation)
			obj.position.set(v.x, v.y, v.z);
		}
		if (att.scale) {
			var v = toV(att.scale)
			obj.scale.set(v.x, v.y, v.z);
		}
		if (att.rotation) {
			var v = toV(att.rotation);
	
			obj.rotation.set(toR(v.x), toR(v.y), toR(v.z));
		}
		if (att.name) {
			obj.name = att.name;
		}
		if (att.id) {
			obj.id = att.id;
		}
		if (att.visible) {
			obj.visible = toB(att.visible);
		}
		if (att.intensity) {
			obj.intensity = Number(att.intensity);
		}
		if (att.target) {
			obj.target = Number(att.target);
		}
	
		if (att.color) {
			obj.color = toColor(att.color);
		}
		if (att.castshadow) {
			obj.castShadow = toB(att.castshadow);
			if (obj.castShadow && obj.type != 'DirectionalLight') {
				obj.traverse(function (node) {
	
					if (node.isMesh) { node.castShadow = true; }
	
				});
			}
		}
		if (att.receiveshadow) {
			obj.receiveShadow = toB(att.receiveshadow);
			if (obj.receiveShadow) {
				obj.traverse(function (node) {
	
					if (node.isMesh) { node.receiveShadow = true; }
	
				});
			}
	
		}
		if (att.shadowdarkness) {
			obj.shadowDarkness = Number(att.shadowdarkness);
		}
		if (att.normalize) {
			handelNormalize(obj);
		}
	
	}

	let doCheckZoom = true;

	this.parseThree = function (htmlParent) {
		if (!htmlParent) {
			htmlParent = document;
		}
		var threeParts = htmlParent.getElementsByTagName('three');
		for (var n = 0; n < threeParts.length; n++) {
			var threeScene;
			if (ThreeScenes.length == 0) {
				threeScene = new ThreeScene(this, threeParts[n], htmlParent);
				ThreeScenes.push(threeScene);
			}
			else {
				threeScene = ThreeScenes[0];
			}
			threeScene.parseChildren(threeParts[n]);

			camera.updateMatrixWorld();
		}
		if (doCheckZoom) {
			CheckZoom();
		}
	}


//Common conversion functions

function toV2(val) {
	var arr = val.split(' ');
	var x = arr.length > 0 ? tryParseNumber(arr[0]) : 0;
	var y = arr.length > 1 ? tryParseNumber(arr[1]) : x;
	return new THREE.Vector2(x, y);
}
function toRotV(val) {
	var v = toV(val);
	return new THREE.Vector3(toR(v.x), toR(v.y), toR(v.z));
}

function Convert(){
	this.toV = function(val, def = new THREE.Vector3()){
		if (val) {
			var arr = val.split(' ');
			var x = arr.length > 0 ? tryParseNumber(arr[0]) : 0;
			var y = arr.length > 1 ? tryParseNumber(arr[1]) : x;
			var z = arr.length > 2 ? tryParseNumber(arr[2]) : y;
			return new THREE.Vector3(x, y, z);
		}
		return def;
	}
	this.toColor = function (color, def = new THREE.Color()) {
		var c = def;
		if (color) {
			if (color.indexOf('#') == 0 || color.indexOf('#') == 0) {
				c = new THREE.Color(color)
			}
			else {
				var v = toV(color);
				c = new THREE.Color(); // create once and reuse
				c.setRGB(v.x, v.y, v.z);
			}
		}
		return c;
	}
	this.toN = function (n, def = 1) {
		if (n && isNo(n)) {
			return Number(n);
		}
		return def;
	}
	this.toB = function (b, def = false) {
		if (b) {
			if (b == 'true' || b == '1') {
				b = true;
			}
			else if (b == 'false' || b == '0') {
				b = false;
			}
		}
		else {
			b = def;
		}
		return b;
	}
	this.toT = function (text, def = undefined) {
		if (text) {
			return text;
		}
		return def;
	}
	this.toR = function (degrees, def = 0) {
		if (degrees) {
			return degrees * Math.PI / 180;
		}
		return def;
	}
	this.toDg= function (radials, def = 0) {
		if (radials) {
			return 180 * radials / Math.PI
		}
		return def;
	}
	
}
this.conv = new Convert();
function toV(val, def = new THREE.Vector3()) {
	return self.conv.toV(val, def);
}
function tryParseNumber(val) {
	if (val) {
		var t = parseFloat(val);
		if (isNaN(t)) {
			return 0;
		}
		return t;
	}
	return 0;
}
function addTransform(ele, att, parent) {
	var group = new THREE.Group();
	parent.add(group);
	return group;
}

function handelNormalize(obj) {
	var bbox = new THREE.Box3().setFromObject(obj);
	var v = bbox.max.clone().sub(bbox.min);
	var maxl = Math.abs(v.x);
	var comp = Math.abs(v.y);
	if (comp > maxl) {
		maxl = comp;
	}
	comp = Math.abs(v.z);
	if (comp > maxl) {
		maxl = comp;
	}
	if (maxl > 0) {
		obj.scale.multiplyScalar(1 / maxl);
	}
}
function toColor(color, def = new THREE.Color()) {
	return self.conv.toColor(color, def);
}
function isNo(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}
function toN(n, def = 1) {
	return self.conv.toN(n, def);
}
function toB(b, def = false) {
	return self.conv.toB(b, def);
}
function toT(text, def = undefined) {
	return self.conv.toT(text, def);
}
function toR(degrees, def = 0) {
	return self.conv.toR(degrees, def);
}
function toDg(radials, def = 0) {

	return self.conv.toDg(radials, def);
}

//End common conversion functions

	var ThreeScene = function (threeml, threenode, htmlParent) {
		var flycontrols;
		var materials = [];
		var canvaszindex = 0;
		var audioContext;
		this.threeml = threeml;
		var youtubePlayers = [];
		var container;
		var threescene = this;
		init(threenode, htmlParent);
		animate();

		function init(X3Dnode, htmlParent) {
			container = X3Dnode.parentNode;

			var innerWidth = window.innerWidth;
			var innerHeight = window.innerHeight;
			if (htmlParent.localName == 'div') {
				innerWidth = parseFloat(htmlParent.style.width);
				innerHeight = parseFloat(htmlParent.style.height);
			}

			camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 2000);
			//camera = new THREE.OrthographicCamera(-0.5 * innerWidth, 0.5 * innerWidth, -0.5 * innerHeight, 0.5 *innerHeight, 0.1, 20000);
			//camera.position.set(0, 0, 10);
			//container.style.pointerEvents = 'none';
			scene = new THREE.Scene();
			scenes.push(scene);
			camera.position.set(0, 0, 0);
			camera.eulerOrder = "YXZ";
			scene.add(camera);
			navigating = CameraMode.FIXED;
			rendererCSS = new CSS3DRenderer();
			rendererCSS.setSize(innerWidth, innerHeight);
			container.appendChild(rendererCSS.domElement);


			// put the mainRenderer on top
			renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
			renderer.setClearColor(0x000000, 0);
			renderer.domElement.style.position = 'absolute';
			renderer.domElement.style.top = 0;
			renderer.domElement.style.zIndex = 1;
			renderer.setSize(innerWidth, innerHeight);
			//renderer.xr.enabled = true;
			renderer.shadowMapEnabled = true;
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap;
			rendererCSS.domElement.appendChild(renderer.domElement);


			window.addEventListener('click', onDocumentMouseClick, false);
			window.addEventListener('contextmenu', onDocumentMouseClick, false);
			document.addEventListener("pointerdown", onMouseDown);
			document.addEventListener("pointerup", onMouseUp);
			document.addEventListener('keyup', (event) => {
				ctrlKey = false;
			});
			document.addEventListener('keydown', (event) => {
				if (event.key == 'F2') {
					if (maintree) {
						clearDatGui();
						if (previousNavigation) {
							navigating = previousNavigation;
							if (navigating == CameraMode.ORBIT && orbitControls) {
								orbitControls.enabled = true;
							}
						}
					}
					else {
						parseScene(scene);
						previousNavigation = navigating;
						if (navigating == CameraMode.ORBIT && orbitControls) {
							orbitControls.enabled = false;
						}

						navigating = CameraMode.FIXED;
					}
				}
				else if (event.code == 'Space' && cursor3d) {
					fixHandle = FixHandle.TOGGLE;
				}
				else if (event.code == 'ControlLeft') {
					ctrlKey = true;
				}
			});
			setHtmlPointerEvents();

		}
		//var ctrlKey = false;
		var fixHandle = FixHandle.NONE;
		var youtubeFocused = false;
		function setHtmlPointerEvents() {

			var listener = function (evt) {
				checkPointedObject();
			}

			window.addEventListener('pointermove', listener);
			window.addEventListener('pointerdown', listener);
			window.addEventListener('pointerup', listener);
			window.setInterval(resetPointerEvents, 1000);
		}
		function checkPointedObject() {
			let pick = getRayCastedObject();// scene.pick(Math.round(evt.offsetX), Math.round(evt.offsetY));
			if (pick) {
				setPointerEvents(false);
				if (pick.parent.threemlType === "HtmlPlaneGeometry") {
					if (!youtubeFocused) {
						setPointerEvents(false);
						//youtubeFocused = true
						//container.style.pointerEvents = 'none'
					}
				}
				else {
					if (youtubeFocused) {
						setPointerEvents(true);
					}
				}
			}
		}
		function resetPointerEvents() {
			//container.style.pointerEvents = 'auto'
			checkPointedObject();

		}
		function setPointerEvents(onCanvas) {
			youtubeFocused = !onCanvas
			container.style.pointerEvents = onCanvas ? 'auto' : 'none';
			//console.log(onCanvas ? "Pointers on CANVAS" : "Pointers on FRAME");
		}

		this.parseChildren = function (threenode, group) {
			if (!group) {
				group = scene;
			}
			doParseChildren(threenode, group);
			initYoutubePlayers();
		}
		function handleHomeObject(ele, parent) {
			var att = getAttributes(ele);
			var url='/threeml/models/home.glb'
				const gltfLoader = new GLTFLoader();
			gltfLoader.load(url, (gltf) => {
				let obj = gltf.scene;
				checkObjectUpdateArray(obj);
				obj.name = 'home';
				camera.add(obj);
				setEventParent(obj, obj);
				obj.position.add(new THREE.Vector3(0, 0.51, -1.2));
				var r = toR(80);
				obj.rotation.x = r;
				obj.scale.multiplyScalar(0.2);
				var light = new THREE.SpotLight();
				light.position.z = 1;
				light.position.x = 1;
				light.position.y = -1;
				light.target = obj;
				light.distance = 1.3;
				obj.add(light);
				var f = function () {
					if (!(event.shiftKey || event.ctrlKey || event.altKey)) {
							window.top.location.href = '/';
						}					
					}
				addCallbackFunction(obj, f);
				var att = {
					'action': 'tooltip',
					'text':'Back to the home page'
                }
				handleHoverAtt(obj, att);
				//var f = function () {
				//	if (camera) {
				//		var p = camera.position.clone().add(new THREE.Vector3(0, 0, -2));
				//		p.applyQuaternion(camera.quaternion);
				//		p.add(new THREE.Vector3(0, 1, 0))
				//		obj.position.lerp(p, 0.1);
				//	}
				//}

				//obj.updateArray.push(f);
				//parent.add(obj);
				});
		//	parent.add(obj);
		//	return obj;
		}

		var waitModel;
		function handleWaitObject(ele, parent) {
			var att = getAttributes(ele);
			if (att.url) {
				const gltfLoader = new GLTFLoader();
				gltfLoader.load(att.url, (gltf) => {
					waitModel = gltf.scene;
					setCommonAttributes(waitModel, att);
					checkevents(ele, waitModel);
					var visible = toB(att.visible);
					waitModel.visible = visible;
					parent.add(waitModel);
				});
			}
		}
		function showWaitModel(parent, p) {
			if (waitModel) {
				if (p) {
					waitModel.position.set(p.x, p.y, p.z);
					parent.add(waitModel);
				}
				waitModel.visible = true;
			}
		}
		function hideWaitModel(parent) {
			if (waitModel) {
				parent.remove(waitModel);
				waitModel.false = true;
			}
		}
		function animate() {
			renderer.setAnimationLoop(doAnimate);
			//requestAnimationFrame(animate);
			//doAnimate();
		}

		var lasttime = 0
		var delta = 1;
		function calculateDelta(time) {
			//var t=clock.getElapsedTime()
			var tdelta = time - lasttime;
			lasttime = time;
			if (tdelta > 0) {
				tdelta = tdelta / 7;
				if (Math.abs(tdelta - delta) < 0.1) {
					delta = (99 * delta + tdelta) / 100;
				}
			}
			//console.log(delta);

		}
		function doAnimate(time) {
			calculateDelta(time);
			fillAllObjects();
			checkCam();
			const delta = clock.getDelta();
			scene.traverse(obj => {
				if (typeof obj.update === 'function' && obj.type != 'CubeCamera') {
					obj.update(delta);

				}
				if (obj.material && obj.material.envMap) {
					obj.visible = false;
					cubeCamera.position.set(obj.position.x, obj.position.y, obj.position.z);
					cubeCamera.update(renderer, scene);
					obj.visible = true;
				}
				simulateSoftBody(obj);
			});
			fixHandle = FixHandle.NONE;

			if (camera.update) {
				camera.update();
			}
			if (flycontrols) {
				flycontrols.movementSpeed = 1;
				flycontrols.update(delta);
			}
			else if (orbitControls && navigating == CameraMode.ORBIT) {
				orbitControls.update();
			}
			checkLoader();
			rendererCSS.render(scene, camera);
			renderer.render(scene, camera);

		}
		var mouseobj;
		function checkCam() {
			if (navigating == CameraMode.FLY || navigating == CameraMode.ORBIT) {
				return;
			}
			if (navigating == CameraMode.DRAG) {
				if (mouseDown) {
					if (!mouseobj) {
						mouseobj = new THREE.Object3D();
						camera.lookAt(mouseobj);
					}
					var raycaster = new THREE.Raycaster();
					var mouse = getTheMousePos();
					raycaster.setFromCamera(mouse, camera);
					var raydirection = raycaster.ray.direction;
					var p = camera.position.clone();
					raydirection.multiplyScalar(10);
					p.add(raydirection)
					mouseobj.position.set(p.x, p.y, p.z);

				}

				return
			}
			if (navigating != CameraMode.FIXED) {
				var lmousePos = mousePos;

				if (lmousePos && defaultLookat) {
					var intersected = getRayCastedObject();
					if (intersected && ((intersected.geometry && intersected.geometry.type == 'PlaneGeometry')
						|| (intersected.present || intersected.callback))) {
						//return;
					}
					var x = lmousePos.x - (0.5 * window.innerWidth) + defaultLookat.x;
					var y = lmousePos.y - (0.5 * window.innerHeight) + defaultLookat.y;
					//console.log('mousex:' + mousePos.x + ' x:' + x);
					var fact = 0.05;
					x = -fact * x;
					y = fact * y;

					var speedx = (x ** 2) ** 2 / (window.screen.width ** 2) ** 2;
					var speedy = (y ** 2) ** 2 / (window.screen.height ** 2) ** 2;
					if ((camera.rotation.x > cameraMaxXangle && y < 0) || (camera.rotation.x < -cameraMaxXangle && y > 0)) {
						y = 0;
					}
					if ((navigating == CameraMode.LOOKAT) && ((camera.rotation.y > cameraMaxXangle && x > 0) || (camera.rotation.y < -cameraMaxXangle && x < 0))) {
						if (camera.rotation.y > cameraMaxYangle || camera.rotation.y < -cameraMaxYangle) {
							x = 0;
						}
						else if (Math.abs(camera.rotation.y) > cameraMaxXangle) {
							x = 100 * x / Math.abs(toDg(camera.rotation.y) ** 2);
						}
					}
					camera.rotation.x -= 500 * speedy * y;
					camera.rotation.y += 500 * speedx * x;

				}
				else {
					var vector = new THREE.Vector3(0, 0, -100);
					vector.applyQuaternion(camera.quaternion);
					//console.log(vector);
					defaultLookat = vector;
				}
			}
		}




		//Common tags
		function doParseChildren(ele, parent) {
			for (var n = 0; n < ele.children.length; n++) {
				checkEle(ele.children[n], parent);
			}

		}
		function checkEle(ele, parent) {
			var name = ele.localName.toLowerCase();

			console.log(name);
			var tr = parent;
			switch (name) {
				case 'mobilemessage':
					handleMobileMessage(ele, parent);
					break;
				case 'loader':
					return handleLoader(ele, parent);
				case 'camera':
					return handleCamera(ele, parent);
					break;
				case 'renderer':
					handleRenderer(ele);
					break;
				case 'scene':
					handleScene(ele);
					break;
				case 'canvas':
					handleCanvas(ele);
					break;
				case 'waitobject':
					return handleWaitObject(ele, parent);
					break;
				case 'planegeometry':
				case 'planebuffergeometry':
					return handlePlaneGeometry(ele, parent);
					break;
				case 'parametricgeometry':
				case 'parametricbuffergeometry':
					return handleParametricBufferGeometry(ele, parent);
					break;
				case 'spheregeometry':
				case 'spherebuffergeometry':
					return handleSphereGeometry(ele, parent);
					break;
				case 'boxgeometry':
				case 'boxbuffergeometry':
					return handleBoxGeometry(ele, parent);
					break;
				case 'reflector':
					return handleReflector(ele, parent);
				case 'circlegeometry':
					return handleCircleGeometry(ele, parent);
					break;
				case 'conegeometry':
					return handleConeGeometry(ele, parent);
					break;
				case 'torusgeometry':
					return handleTorusGeometry(ele, parent);
					break;
					handleTorusGeometry
				case 'cylindergeometry':
					return handleCylinderGeometry(ele, parent);
					break;
				case 'chatbox':
					return handleChatBox(ele, parent);

				case 'htmlplanegeometry':
					return handleHtmlPlaneGeometry(ele, parent);
					break;
				case 'gltfloader':
					return handleGltfLoader(ele, parent);
					break;
				case 'directionallight':
					return handleDirectionalLight(ele, parent);
					break;
				case 'pointlight':
					return handlePointLight(ele, parent);
					break;
				case 'hemispherelight':
					return handleHemisphereLight(ele, parent);
				case 'ambientlight':
					return handleAmbientLight(ele, parent);
					break;
				case 'textgeometry':
					return handleTextGeometry(ele, parent);
				case 'skybox':
					return handleSkyBox(ele);

				case 'spotlight':
					return handleSpotLight(ele, parent);
					break;
				case 'water':
					return handleWater(ele, parent);
					break;
				case 'group':
					tr = handleGroup(ele, parent);
					break;
				case 'line':
					return handleLine(ele, parent);
				case 'datgui':
					return handleDatGui(ele, parent);
				case 'media':
					return handleMediaObject(ele);
					break;
				case 'sprite':
					return handleSprite(ele, parent);
				case 'fog':
					return handleFog(ele);
				case 'flycontrols':
					return handleFlyControls(ele);
				case 'orbitcontrols':
					return handleOrbitControls(ele);
				case 'cursor3d':
					return handleCursor3d(ele);
				case 'home':
					return handleHomeObject(ele, parent);
				case 'rain':
					return handleRain(ele, parent);
				case 'smoke':
					return handleSmoke(ele, parent);
				case 'snow':
					return handleSnow(ele, parent);
				case 'fire':
					return handleFire(ele, parent)
				case 'vrbutton':
					return handleVRbutton(ele, parent);
				case 'stat':
					return handleStat(ele, parent);
				case 'module':
					return handleModule(ele, parent);
				default:
				
				//return v.checkElements(name.ele.parent);

			}
			handleExternalModules(name, ele, parent);
			doParseChildren(ele, tr);
		}
		function handleExternalModules(name, ele, parent) {
			for (var i = 0; i < externalModules.length; i++) {
				var module = externalModules[i];
				if (module.name == name) {
					return module.handle(ele, parent);
				}
			}
		}

		function getWorldPosition(obj) {
			obj.updateMatrixWorld();
			var p = new THREE.Vector3();
			p.setFromMatrixPosition(obj.matrixWorld);
			return p;
		}
		function handleMediaObject(ele) {
			var att = getAttributes(ele);
			if (att.suspend && toB(att.suspend) && audioContext) {
				audioContext.suspend();
			}
		}
		function activateAudio(obj, att) {
			if (att.url) {
				if (!audioContext) {
					audioContext = new AudioContext();
				}
				if (!isplaying) {
					loadSound(obj, att);
				}
			}
		}
		var isplaying = false;
		function loadSound(obj, att) {
			var solo = toB(att.solo, false);

			obj.sound = {};
			obj.sound.source = audioContext.createBufferSource();
			obj.sound.volume = audioContext.createGain();
			// Create a AudioGainNode to control the main volume.
			var mainVolume = audioContext.createGain();
			// Connect the main volume node to the context destination.
			mainVolume.connect(audioContext.destination);
			if (att.volume) {
				mainVolume.gain.value = toN(att.volume);
			}
					// Create an object with a sound source and a volume control.

			if (att.volumetric && toB(att.volumetric)) {
				var panner = audioContext.createPanner();
				panner.panningModel = 'HRTF';
				obj.sound.panner = panner;
				// Instead of hooking up the volume to the main volume, hook it up to the panner.
				obj.sound.volume.connect(obj.sound.panner);
				//// And hook up the panner to the main volume.
				obj.sound.panner.connect(mainVolume);
				obj.sound.source.connect(obj.sound.volume);
				var p = getWorldPosition(obj);

				obj.sound.panner.setPosition(p.x, p.y, p.z);
			}
			else {

				// Connect the sound source to the volume control.
				obj.sound.source.connect(obj.sound.volume);
				// Hook up the sound volume control to the main volume.
				obj.sound.volume.connect(mainVolume);
			}

			// Make the sound source loop.
			var loop = toB(att.loop);
			obj.sound.source.loop = loop;
					//loadSound(obj);

			// Load a sound file using an ArrayBuffer XMLHttpRequest.
			var request = new XMLHttpRequest();
			request.open("GET", att.url, true);
			request.responseType = "arraybuffer";
			request.onload = function (e) {

				// Create a buffer from the response ArrayBuffer.
				audioContext.decodeAudioData(this.response, function onSuccess(buffer) {
					obj.sound.buffer = buffer;

					// Make the sound source use the buffer and start playing it.
					obj.sound.source.buffer = obj.sound.buffer;
					if (solo) {
						isplaying = true;
					}
					obj.sound.source.onended = function () { isplaying = false; };
					obj.sound.source.start(audioContext.currentTime);
				}, function onFailure() {
					console.info("Decoding the audio buffer from '" + att.url +"' failed.");
				});
			};
			request.send();
        }
		function getRandowmName() {
			return "name_" + Math.random();
		}
		function clearDatGui() {
			if (maintree) {
				document.body.removeChild(maintree);
				maintree = undefined;
			}
			if (gui) {
				try {
					gui.destroy();
				}
				catch (e) { }
			}
		}
		function handleDatGui(ele, parent) {
			var att = getAttributes(ele);
			if (toB(att.clear)) {

				clearDatGui();
			}
			else {
				parseScene(scene);
			}

		}
		function highVectorValue(v) {
			var r = 0;
			if (v) {
				var x = Math.abs(v.x);
				var y = Math.abs(v.y);
				var z = Math.abs(v.z);
				r = x > y ? x : y;
				r = r > z ? r : z;
			}
			return r;
		}
		function highValue(v) {
			var r = v;
			if (r == 0) { r = 1; }
			return r * 5 * guifact;
		}
		var guifact = 1;
		var sceneno=0;
		function showGui(guiElement, name) {
			if (guiElement) {
				createGUI();
				if (renderer.clearColor) {
					const folder2 = gui.addFolder('Renderer')
					var conf = { color: renderer.getClearColor().getHex() };
					folder2.addColor(conf, 'color').onChange(function (colorValue) {
						renderer.setClearColor(colorValue);
					});
				}

				scene.traverse(function (child) {
					if (child.id == guiElement) {
						if(name.toLowerCase()=='scene'){
							if(sceneno>0){
								name+=sceneno;
								return;
							}
							sceneno++;
						}
						const folder = gui.addFolder(name)
						if (child.position) {
							var f = highValue(highVectorValue(child.position));
							folder.add(child.position, 'x').min(-f).max(f).step(0.01);
							folder.add(child.position, 'y').min(-f).max(f).step(0.01);
							folder.add(child.position, 'z').min(-f).max(f).step(0.01);
						}
						if (child.rotation) {
							var conf = { x: toDg(child.rotation.x), y: toDg(child.rotation.y), z: toDg(child.rotation.z) };

							folder.add(conf, 'x').min(-180).max(180).step(0.01).onChange(function (sv) { child.rotation.x = toR(sv); });
							folder.add(conf, 'y').min(-180).max(180).step(0.01).onChange(function (sv) { child.rotation.y = toR(sv); });
							folder.add(conf, 'z').min(-180).max(180).step(0.01).onChange(function (sv) { child.rotation.z = toR(sv); });
						}
						if (child.scale) {
							var cs = child.scale.x;
							var f = highValue(highVectorValue());
							var conf = { scale: cs };

							folder.add(conf, 'scale').min(0.1 * cs).max(f).step(0.001).onChange(function (sv) {
								child.scale.x = sv;
								child.scale.y = sv;
								child.scale.z = sv;
							});
							//folder.add(child.scale, 'y').min(0.01).max(10).step(0.001);
							//folder.add(child.scale, 'z').min(0.01).max(10).step(0.001);
						}
						if (child.intensity) {
							var f = highValue(child.intensity);
							folder.add(child, 'intensity').min(0.01).max(f).step(0.001);
						}
						if (child.material) {
							if (child.material.color) {
								var conf = { color: child.material.color.getHex() };
								folder.addColor(conf, 'color').onChange(function (colorValue) {
									child.material.color.set(colorValue);
								});
							}
							if (child.material.specular) {
								var conf = { specular: child.material.specular.getHex() };
								folder.addColor(conf, 'specular').onChange(function (specularValue) {
									child.material.specular.set(specularValue);
								});
							}
							if (child.material.shininess) {
								var conf = { shininess: toN(child.material.shininess) };
								folder.add(conf, 'shininess').min(0).max(1000).step(0.1).onChange(function (shininessValue) {
									child.material.shininess = shininessValue;
								});
							}
						}
						if (child.color) {
							var conf = { color: child.color.getHex() };
							folder.addColor(conf, 'color').onChange(function (colorValue) {
								child.color.set(colorValue);///RGB(colorValue.r / 256, colorValue.g / 256, colorValue.b/256);
							});
						}
						folder.open();
						if (child.fixarr) {
							var s = child.fixarr.join(' ');
							var conf = { fixed: s };
							folder.add(conf, 'fixed');
						}
					}
				});

			}

		}
		function handleSprite(ele, parent) {
			var att = getAttributes(ele);

			let material = assureSpriteMaterial(ele, att);

			const obj = new THREE.Sprite(material);
			setCommonAttributes(obj, att);
			checkevents(ele, obj);

			parent.add(obj);
		}
		function assureSpriteMaterial(ele, att) {

			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'dynamictexturematerial':
						return getDynamicTextureMaterial(child);
				}
			}
			const loader = new THREE.TextureLoader();
			let mapC = loader.load(att.url);
			return new THREE.SpriteMaterial({ map: mapC, color: 0xffffff, fog: true });
		}
		function handleFire(ele, parent) {
			var att = getAttributes(ele);
			var texture = att.url ? att.url : '/threeml/textures/Fire.png';
			var textureLoader = new THREE.TextureLoader();
			var tex = textureLoader.load(texture);
			var fire = new Fire(tex	);
			setCommonAttributes(fire, att);

			var f = function () {
				fire.updateFire(clock.elapsedTime);
            }
			checkObjectUpdateArray(fire);
			fire.updateArray.push(f);
			parent.add(fire);
        }
		function handleSnow(ele, parent) {
			var att = getAttributes(ele);
			var rainCount = att.raincount ? toN(att.raincount) : 15000;
			var rainGeo = new THREE.Geometry();
			var dropletscale = (att.dropletscale ? toN(att.dropletscale) : 1) * 0.01;
			var speed = (att.speed ? toN(att.speed) : 1) * 0.001;
			var color = att.color ? toColor(att.color) : 0xaaaaff;
			for (let i = 0; i < rainCount; i++) {
				var rainDrop = new THREE.Vector3(
					(Math.random() - 0.5),
					(Math.random() - 0.5),
					(Math.random() - 0.5)
				);
				rainGeo.vertices.push(rainDrop);
			}
			const textureLoader = new THREE.TextureLoader();

			const sprite = textureLoader.load('/threeml/textures/snowflake.png');

			var material = new THREE.PointsMaterial({ size: dropletscale, map: sprite, color: color, blending: THREE.AdditiveBlending, depthTest: false, transparent: true });

			var rain = new THREE.Points(rainGeo, material);
			checkObjectUpdateArray(rain);

			var f = function () {
				rain.geometry.vertices.forEach(p => {
					if (isNaN(p.velocity)) {
						p.velocity = -speed - Math.random() * speed;
					}
					//p.velocity -= 0.001 + Math.random() * 0.001;
					p.y += p.velocity;
					if (p.y < -1) {
						p.y = 1;
						//p.velocity = 0;
					}
				});
				rain.geometry.verticesNeedUpdate = true;
				//rain.rotation.y += 0.002;
			}
			rain.updateArray.push(f);
			setCommonAttributes(rain, att);
			parent.add(rain);
		}

		function handleRain(ele, parent) {
			var att = getAttributes(ele);
			var rainCount = att.raincount ? toN(att.raincount) : 15000;
			var rainGeo = new THREE.Geometry();
			var dropletscale = (att.dropletscale ? toN(att.dropletscale) : 1) * 0.01;
			var speed = (att.speed ? toN(att.speed) : 1) * 0.01;
			var color = att.color ? toColor(att.color) : 0xaaaaff;
			for (let i = 0; i < rainCount; i++) {
				var rainDrop = new THREE.Vector3(
					 (Math.random()-0.5 ) ,
					 (Math.random()-0.5 ),
					 (Math.random() -0.5)
				);
				rainGeo.vertices.push(rainDrop);
			}
			const textureLoader = new THREE.TextureLoader();

			const sprite = textureLoader.load('/threeml/textures/drop.png');

			var material = new THREE.PointsMaterial({ size: dropletscale, map: sprite, color: color, blending: THREE.AdditiveBlending, depthTest: false, transparent: true });

			var rain = new THREE.Points(rainGeo, material);
			checkObjectUpdateArray(rain);

			var f = function () {
				rain.geometry.vertices.forEach(p => {
					if (isNaN(p.velocity)) {
						p.velocity = -speed - Math.random() * speed;
                    }
					//p.velocity -= 0.001 + Math.random() * 0.001;
					p.y += p.velocity;
					if (p.y < -1) {
						p.y = 1 ;
						//p.velocity = 0;
					}
				});
				rain.geometry.verticesNeedUpdate = true;
				//rain.rotation.y += 0.002;
			}
			rain.updateArray.push(f);
			setCommonAttributes(rain, att);
			parent.add(rain);
        }

		function handleSmoke(ele, parent) {
			var att = getAttributes(ele);
			var speed = (att.speed ? toN(att.speed) : 1) * 0.001;
			var color = att.color ? toColor(att.color) : 0x00dddd;
			var number = att.number ? toN(att.number) : 10;

			var smokeTexture = THREE.ImageUtils.loadTexture('/threeml/textures/Smoke-Element.png');
			var smokeMaterial = new THREE.MeshLambertMaterial({ color: color, map: smokeTexture, transparent: true });
			var smokeGeo = new THREE.PlaneGeometry(1, 1);

			var smokegroup = new THREE.Group();
			setCommonAttributes(smokegroup, att);
			for (var p = 0; p < number; p++) {
				var particle = new THREE.Mesh(smokeGeo, smokeMaterial);
				particle.position.set((Math.random() - 0.5),
					(Math.random() - 0.5),
					(Math.random() - 0.5));
				particle.speed=new THREE.Vector3((Math.random() - 1),
					(Math.random() - 1),
					(Math.random() - 1));

				particle.rotation.z = toR(Math.random() * 360);
				particle.velocity = Math.random() * speed;
				smokegroup.add(particle);
			}
			var f = function () {
				for (var n = 0; n < smokegroup.children.length; n++) {
					var p = smokegroup.children[n];
					p.rotation.z += particle.velocity;
					var oldPos = p.position.clone();
					p.position.add(p.speed.clone().multiplyScalar(0.0001));
					if (p.position.x < 0 || p.position.x > 1){
						p.position.x = oldPos.x;
						p.speed.x = -p.speed.x;
                    }
					if (p.position.y < 0 || p.position.y > 1){
						p.position.y = oldPos.y;
						p.speed.y = -p.speed.y;
					}
					//if (p.position.z < 0 || p.position.z > 1){
					//	p.position.z = oldPos.z;
					//	p.speed.z = -p.speed.z;
					//}
                }

			}
			checkObjectUpdateArray(smokegroup);
			smokegroup.updateArray.push(f);

			parent.add(smokegroup);

		}

		function handleVRbutton(ele, parent) {
			renderer.xr.enabled = true;
			renderer.xr.setReferenceSpaceType('local');
			document.body.appendChild(VRButton.createButton(renderer));
        }

		function handleLine(ele, parent) {
			var att = getAttributes(ele);
			var material = assureLineMaterioal(ele);
			var geometry = assureLineGometry(ele);
			var obj = new THREE.Line(geometry, material)
			setCommonAttributes(obj, att);
			checkevents(ele, obj);
			parent.add(obj);
		}
		function assureLineGometry(ele) {
			var geometry = new THREE.Geometry();
			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'geometry':
						return handleGeometry(child, geometry);
				}
			}
			geometry.vertices.push(
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(0, 0, -1));
			return geometry;
		}
		function handleGeometry(ele, geometry) {
			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'vector':
						var v = handleVector(child);
						if (v) {
							geometry.vertices.push(v);
						}
				}
			}
			return geometry;
		}
		function handleVector(obj) {
			var att = getAttributes(obj);
			if (att.val) {
				return toV(att.val);
			}
		}
		function assureLineMaterioal(ele) {
			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'linebasicmaterial':
						return handleBasciLineMaterial(child);
				}
			}
			return new THREE.LineBasicMaterial();
		}
		function handleBasciLineMaterial(ele) {
			var att = getAttributes(ele);
			var width = toN(att.linewidth, 1);
			var opacity = toN(att.opacity, 1);
			var color = toColor(att.color);
			var parameters = {
				color: color,
				opacity: opacity,
				linewidth: width
			};
			return new THREE.LineBasicMaterial(parameters);
		}
		function getUrlVars() {
			var vars = [], hash;
			var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
			for (var ii = 0; ii < hashes.length; ii++) {
				hash = hashes[ii].split('=');
				vars.push(hash[0]);
				vars[hash[0].toLowerCase()] = hash[1];
			}
			return vars;
		};
		function getUrlVar(name) {
			return getUrlVars()[name.toLowerCase()];
		};

		function handleGroup(ele, parent) {
			var att = getAttributes(ele);
			var obj = new THREE.Group();
			setCommonAttributes(obj, att);
			checkevents(ele, obj);
			checkObjectUpdateArray(obj);
			
			if (att.url) {
				obj.loaded = false;
				var url = att.url
				if (att.urlvar) {
					var v = getUrlVar(att.urlvar);
					url += '?' + att.urlvar + '=' + v;
				}
				obj.url =url;
				if (!obj.name || obj.name.length == 0) {
					obj.name = getRandowmName();
					ele.setAttribute("name", obj.name);
				}
				obj.margin=toN(att.margin, 0);
				obj.replace=toB(att.replace, false);
				var f = function () {
					if (!obj.loaded) {
						if(obj.margin==0 || obj.getWorldPosition(new THREE.Vector3()).distanceTo(camera.getWorldPosition(new THREE.Vector3()))<obj.margin){
							self.loadInGroup(obj.name, obj.url, obj.replace);
							obj.loaded = true;
						}
					}
					else if(obj.loaded && obj.margin!=0 && obj.getWorldPosition(new THREE.Vector3()).distanceTo(camera.getWorldPosition(new THREE.Vector3()))>obj.margin * 1.1){
						doClearGoupChildren(obj);
						obj.loaded=false;
					}
				}


				obj.updateArray.push(f);
			}
			if (att.parent) {
				var p;
				switch (att.parent) {
					case 'camera':
						p = camera;
						break;
					case 'scene':
						p = scene;
						break;
					default:
						p = scene.getObjectByName(att.parent);
						break;
				}
				if (p) {
					parent = p;
				}

			}
			parent.add(obj);
			return obj;
		}
		function handleChatBox(ele, parent) {
			//var att = getAttributes(ele);
			//var name = toT(att.name, 'myChatBox');
			//var chatGroup = handleGroup(ele, parent);
			ele.setAttribute('url', '/sub/chat/receiver.html')
			var plane=handleHtmlPlaneGeometry(ele, parent);
			//setCommonAttributes(chatGroup, att);
			// if (!socket) {
			// 	socket = io.connect('http://localhost:3000');
			// }


			// socket.on('new message', function (data) {
			// 	let code = '<sprite><DynamicTextureMaterial text="' + data.message+'" fontSize="50"  fontcolor="black" backgroundcolor="transparent"></DynamicTextureMaterial></sprite>';

			// 	self.loadCodeInGroup(name, code);
			// 	//chatArea.append('<div class="well">' + data.message + '</div>');
			// });
			//parent.add(plane);
		}
		function handleGltfLoader(ele, parent) {
			var att = getAttributes(ele);
			if (att.name) {
				var tobj = scene.getObjectByName(att.name);
				if (tobj) {
					return tobj;
				}
			}
			if (att.url) {
				var p = toV(att.position)
				showWaitModel(parent, p);
				const gltfLoader = new GLTFLoader();
				loaderRegistrations++;
				gltfLoader.load(att.url, (gltf) => {
					const root = gltf.scene;
					threescene.checkRepeat(ele, root, parent);
					loaderRegistrations--;

					//addModelInScene(root, att, ele, parent)
				});
			}
		}

		function setEventParent(parent, ele) {
			for (var n = 0; n < ele.children.length; n++) {
				var ch = ele.children[n];
				setEventParent(parent, ch);
				if (ch.type == "Mesh") {
					ch.eventParent = parent;
				}
			}
		}
		function meshFromBoundingBox(bbox) {
			var h = bbox.max.y - bbox.min.y;
			var w = bbox.max.x - bbox.min.x;
			var d = bbox.max.z - bbox.min.z;
			var b = new THREE.BoxGeometry(w, h, d);
			var c = new THREE.Color();
			var material = new THREE.MeshPhongMaterial({
				color: c,
				opacity: 0.5,
				transparent: true,
			});

			var obj = new THREE.Mesh(b, material);
			obj.visible = false;
			return obj;
		}
		function handleSkyBox(ele) {
			{
				var att = getAttributes(ele);
				const loader = new THREE.TextureLoader();
				if (att.url) {
					loaderRegistrations++;
					const texture = loader.load(
						att.url,
						() => {
							const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
							rt.fromEquirectangularTexture(renderer, texture);
							scene.background = rt;
							loaderRegistrations--;
						});
				}
				else {
					scene.background = '';
				}
			}
		}

		function getBarImage(imageType) {
			const img = document.createElement('img');
			img.src = imageType;
			img.style.width = '40px';
			img.style.height = '40px';
			img.style.margin = '5px';
			return img;
		}
		function getImageBarButton(name, title, imageType, bgc) {
			const div_h = document.createElement('div');
			div_h.style.width = '50px';
			div_h.style.height = '50px';
			div_h.title = title;
			if (bgc) {
				div_h.style.backgroundColor = bgc;
			}
			div_h.style.cursor = 'pointer';
			div_h.style.marginRight = '5px';
			//div_h.style.border = 'solid';
			div_h.name = name;
			div_h.className = name;
			const img = getBarImage(imageType);
			div_h.appendChild(img);
			return div_h;
		}
		let hasYoutubeApi = false;
		function checkYoutubeApi() {

			if (!hasYoutubeApi) {
				//var tag = document.createElement('script');
				//tag.src = "https://www.youtube.com/player_api";
				//var firstScriptTag = document.getElementsByTagName('script')[0];
				//firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
				hasYoutubeApi = true;
			}


		}

		function handleHtmlPlaneGeometry(ele, parent) {
			var bgc = undefined;
			var att = getAttributes(ele);
			if (att.name) {
				var tobj = scene.getObjectByName(att.name);
				if (tobj) {
					console.log('Duplicate attempt to initiate ' + att.name + '.');
					return tobj;
				}
			}
			var holder = new THREE.Group();
			parent.add(holder);
			if (ele.innerHTML) {
				att.html = ele.innerHTML.replace('<!--', '').replace('-->', '');
			}
			const div = document.createElement('div');
			if (att.videoId) {
				div.setAttribute("ID", videoId);
			}
			var dw = 1920;
			var dh = 1080;
			var w = dw;
			var h = dh;
			var wf = 1;
			var hf = 1;
			var panelBarHeight = 50;
			var panelbar = toB(att.panelbar, true);


			if (att.width) {
				w = att.width;
				wf = Number(w) / dw;
			}
			if (att.height) {
				h = att.height;
				var corr = panelbar ? 0 : panelBarHeight;
				hf = (Number(h) - corr) / dh;
			}

			div.style.width = w + 'px';
			div.style.height = h + 'px';


			div.style.backgroundColor = '#000';

			div.className = 'tml_panel';

			const div_bar = document.createElement('div');
			div_bar.style.width = '100%';
			div_bar.style.height = panelBarHeight + 'px';
			div_bar.className = 'tml_bar';
			if (!(att.custombarcolor && toB(att.custombarcolor))) {
				//div_bar.style.backgroundColor = bgc;
			}

			if (!panelbar) {
				div_bar.style.display = 'none';
			}

			const div_left_menu = document.createElement('div');
			div_left_menu.style.width = '170px';
			div_left_menu.style.display = 'inline-block';
			//home button:
			const div_hb = getImageBarButton('home', 'Home', Images.Home, bgc);

			div_hb.style.float = 'left';
			if (att.homebutton) {
				if (!toB(att.homebutton)) {
					div_hb.style.display = 'none';
				}
			}

			div_left_menu.appendChild(div_hb);
			//left button:
			const div_lb = getImageBarButton('left', 'Previous', Images.ArrowLeft, bgc);
			div_lb.style.display = 'none'
			div_lb.style.float = 'left';
			div_left_menu.appendChild(div_lb);
			//right button:
			const div_rb = getImageBarButton('right', 'Next', Images.ArrowRight, bgc);
			div_rb.style.display = 'none'
			div_rb.style.float = 'right';
			div_left_menu.appendChild(div_rb);

			div_bar.appendChild(div_left_menu);
			//present button:
			const div_h = getImageBarButton('handle', 'Present', Images.MagnifyImage, bgc);
			div_h.style.display = 'none'
			div_h.style.float = 'right';

			div_bar.appendChild(div_h);
			div.appendChild(div_bar);


			const iframe = document.createElement('iframe');
			if (att.url) {
				iframe.style.width = w + 'px';
				iframe.style.height = h + 'px';
				iframe.style.border = '0px';
				iframe.name = att.name;
				iframe.allow = 'autoplay'
				if (att.scrolling) {
					var scr = toB(att.scrolling);
					if (!scr) {
						iframe.scrolling = 'no';
					}
				}
				if (att.zoom) {
					iframe.style.zoom = att.zoom;
				}
				iframe.src = att.url;
				div.appendChild(iframe);
			}
			else if (att.videoid) {//youtube
			}
			else if (att.html) {
				//div.style.backgroundColor = '#FFF';
				//iframe.srcdoc = att.html;
				const d = document.createElement('div');
				d.innerHTML = att.html;
				div.appendChild(d);
			}
			const obj = new CSS3DObject(div);

			holder.add(obj);

			//add transparantplane
			var geometry = new THREE.PlaneGeometry(1.53 * wf, 0.92 * hf);
			var material = new THREE.MeshBasicMaterial();
			material.color.set('black'); //red
			material.opacity = 0;
			material.blending = THREE.NoBlending;
			material.side = THREE.DoubleSide;
			var p = new THREE.Mesh(geometry, material);
			var pcorr = panelbar ? -0.027 : 0;
			p.position.set(0, pcorr, 0);

			holder.add(p);
			p.eventParent = holder;

			setCommonAttributes(holder, att);
			var v = obj.scale;
			obj.scale.set(0.0008 * v.x, 0.0008 * v.y, 0.0008 * v.z);
			checkevents(ele, holder);
			//iframe history
			if (att.url) {
				iframe.addEventListener("load", function () { checkIrameHistory(obj, iframe, div_lb, div_rb); });
				div_hb.addEventListener("click", function () { goHome(iframe); });
				div_lb.addEventListener("click", function () { goPrev(obj, iframe); });
				div_rb.addEventListener("click", function () { goNext(obj, iframe); });
			}
			else if (att.videoid) {
				//http://jsfiddle.net/4WPmY/6/
				//checkYoutubeApi();
				obj.videoid = att.videoid;
				youtubePlayers.push(obj)
				div_hb.addEventListener("click", function () {
					obj.player.playVideo();
				});

			}


			div.addEventListener("mouseout", function () {
				setPointerEvents(true)
			});

			holder.threemlType = 'HtmlPlaneGeometry';
			return obj;

		};
		function initYoutubePlayers() {
			for (let n = 0; n < youtubePlayers.length; n++) {
				let obj = youtubePlayers[n];
				obj.player = new YT.Player(obj.videoid, {
					height: '100%',
					width: '100%',
					videoId: obj.videoid,
				});
				//obj.player.playVideo();
			}
			//document.getElementById('resume').onclick = function () {
			//	var o = threeml.getScene().getObjectByName('bpOR_HuHRNs');
			//	o.player.playVideo();
			//};
			//document.getElementById('pause').onclick = function () {
			//	player.pauseVideo();
			//};

		}
		function goHome(ifr) {
			ifr.src = ifr.src;
		}
		function goPrev(obj, ifr) {
			//ifr.src = ifr.src;
			if (obj.history && obj.historyIdx > 1) {
				obj.historyIdx--;
				ifr.src = obj.history[obj.historyIdx];
			}
		}
		function goNext(obj, ifr) {
			if (obj.history && obj.historyIdx < obj.history.length) {
				obj.historyIdx++;
				ifr.src = obj.history[obj.historyIdx];
			}
		}
		function checkIrameHistory(obj, ifr, lburron, rbutton) {
			if (!ifr || !ifr.contentWindow || !ifr.contentWindow.location) {
				return;
			}
			try {
				var a = ifr.contentWindow.location.href;
			}
			catch (x) {
				return;
			}
			if (!obj.history) {
				obj.history = [];
				obj.historyIdx = -1;
			}
			var loc = ifr.contentWindow.location;
			if (obj.history.length == obj.historyIdx) {
				obj.history.push(loc);
				obj.historyIdx = obj.history.length;
			}
			if (obj.historyIdx > 0) {
				lburron.style.display = 'inline-block';
			}
			else {
				lburron.style.display = 'none';
			}
			if (obj.historyIdx < obj.history.length - 1) {
				rbutton.style.display = 'inline-block';
			}
			else {
				rbutton.style.display = 'none';
			}
		}

		var maxLoaderTime = 5;
		var loaderRegistrations = 0;
		function handleLoader(ele, parent) {
			var att = getAttributes(ele);
			maxLoaderTime = toN(att.maxtime, 15);
			var se = document.createElement('style');
			se.innerHTML = LoaderCss;
			document.head.appendChild(se);
			var cover = document.createElement('div');
			cover.id = 'cover';
			document.body.appendChild(cover);
			var ldr = document.createElement('div');
			ldr.id = 'loader';
			cover.appendChild(ldr);
        }

		function checkLoader() {
			if (maxLoaderTime <= clock.elapsedTime || loaderRegistrations<=0) {
				var cover = document.getElementById('cover');
				if (cover) {
					cover.style.display = 'none';
				}
			}
			
        }

		function handleCamera(ele, parent) {
			var att = getAttributes(ele);
			if (att.mode) {
				switch (att.mode) {
					case "lookat":
						navigating = CameraMode.LOOKAT;
						break;
					case "scan":
						navigating = CameraMode.SCAN;
						break;
					case "click":
						navigating = CameraMode.CLICK;
						break;
					case "drag":
						navigating = CameraMode.DRAG;
						break;
					default:
						navigating = CameraMode.FIXED;
						camera.lookAt(new THREE.Vector3(0, 0, -100));
						break;
				}
			}
			else {
				navigating = CameraMode.FIXED;
				camera.lookAt(new THREE.Vector3(0, 0, -100));
			}
			if (att.position) {
				var v = toV(att.position)
				camera.position.set(v.x, v.y, v.z);
			}
			if (att.rotation) {
				var v = toV(att.rotation)
				camera.rotation.set(v.x, v.y, v.z);
			}
			cameraMaxXangle = toR(att.maxxangle, cameraMaxXangleDef);
			cameraMaxYangle = toR(att.maxyangle, cameraMaxYangleDef);
		}
		function handleCanvas(ele) {
			var att = getAttributes(ele);
			if (att.zindex) {
				var canvas = document.getElementsByTagName('canvas');
				canvaszindex = toN(att.zindex);
				for (var n = 0; n < canvas.length; n++) {
					canvas[n].style.zIndex = canvaszindex;
				}
			}

		}
		function handleRenderer(ele) {
			var att = getAttributes(ele);
			if (att.clearcolor) {
				var c = toColor(att.clearcolor); // create once and reuse
				renderer.setClearColor(c);//0xb0f442);
			}
		}
		function handleScene(ele) {
			var att = getAttributes(ele);
			if (att.background) {
				var c = toColor(att.background);
				scene.background = c;
			}
			if (att.checkzoom) {
				doCheckZoom = toB(att.checkzoom);
			}
		}

		function handlePlaneGeometry(ele, parent) {
			var att = getAttributes(ele);
			var geometry = new THREE.PlaneBufferGeometry(1, 1);
			var material = assureGeometryMat(ele);
			var obj = new THREE.Mesh(geometry, material);

			setCommonAttributes(obj, att);
			checkevents(ele, obj);
			parent.add(obj);
			return obj;

		}
		function handleParametricBufferGeometry(ele, parent) {
			var att = getAttributes(ele);
			var width = toN(att.width, 10);
			var height = toN(att.height, 10);
			var xSegs = toN(att.xsegs, 10);
			var ySegs = toN(att.ysegs, 10);
			const planeFunction = plane(xSegs, ySegs);
			function plane(width, height) {
				return function (u, v, target) {
					const x = (u - 0.5) * width;
					const y = (v + 0.5) * height;
					const z = 0;
					target.set(x, y, z);
				};
			}

			var geometry = new THREE.ParametricBufferGeometry(planeFunction, width, height);
			var material = assureGeometryMat(ele);
			var obj = new THREE.Mesh(geometry, material);
			setCommonAttributes(obj, att);
			checkevents(ele, obj);
			parent.add(obj);
			return obj;


		}




		function handleBoxGeometry(ele, parent) {
			var att = getAttributes(ele);
			var geometry = new THREE.BoxBufferGeometry();

			var material = assureGeometryMat(ele);
			var obj = new THREE.Mesh(geometry, material);

			setCommonAttributes(obj, att);
			checkevents(ele, obj);
			parent.add(obj);
			return obj;

		}
		function handleReflector(ele, parent) {
			var att = getAttributes(ele);
			var type = att.type ? att.type : 'circle';
			var geometry;
			switch (type) {
				case 'box':
					geometry = new THREE.BoxBufferGeometry();
					break;
				case 'sphere':
					geometry = new THREE.SphereBufferGeometry(1, 80, 80);
					break;
				case 'plane':
					geometry = new THREE.PlaneBufferGeometry();
					break;
				default:
					geometry = new THREE.CircleBufferGeometry(1, 32);
					break;
			}
			var obj = new Reflector(geometry, {
				clipBias: 0.003,
				textureWidth: window.innerWidth * window.devicePixelRatio,
				textureHeight: window.innerHeight * window.devicePixelRatio,
				color: 0x777777,
				recursion: 1
			});
			setCommonAttributes(obj, att);
			checkevents(ele, obj);
			parent.add(obj)


		}
		function handleSphereGeometry(ele, parent) {
			var att = getAttributes(ele);
			//radius : Float, widthSegments : Integer, heightSegments : Integer, phiStart : Float, phiLength : Float, thetaStart : Float, thetaLength : Float
			var radius = toN(att.radius, 1);
			var widthSegments = toN(att.widthsegments, 30);
			var heightSegments = toN(att.heightsegments, 30);
			var phiStart = toN(att.phistart, 0);
			var phiLength = toN(att.philength, 2 * Math.PI);
			var thetaStart = toN(att.thetastart, 0);
			var thetaLength = toN(att.thetalength, Math.PI);

			var geometry = new THREE.SphereBufferGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
			var material = assureGeometryMat(ele);
			var obj = new THREE.Mesh(geometry, material);
			geometry.computeVertexNormals();
			setCommonAttributes(obj, att);
			checkevents(ele, obj);
			parent.add(obj);
			return obj;

		}
		function handleCircleGeometry(ele, parent) {
			var att = getAttributes(ele);
			var radius = toN(att.radius, 1);
			var segments = toN(att.segments, 32);
			var thetaStart = toR(att.thetastart, 0);
			var thetaLength = toR(att.thetalength, 2*Math.PI);

			var geometry = new THREE.CircleBufferGeometry(radius, segments, thetaStart, thetaLength);
			var material = assureGeometryMat(ele);
			var obj = new THREE.Mesh(geometry, material);
			checkevents(ele, obj);
			setCommonAttributes(obj, att);



	

			parent.add(obj);
			return obj;

		}
		function handleConeGeometry(ele, parent) {
			var att = getAttributes(ele);
			var radius = toN(att.radius, 1);
			var height = toN(att.height, 1);
			var radialSegments = toN(att.radialsegments, 8);
			var geometry = new THREE.ConeBufferGeometry(radius, height, radialSegments);
			var material = assureGeometryMat(ele);
			var obj = new THREE.Mesh(geometry, material);
			checkevents(ele, obj);
			setCommonAttributes(obj, att);
			parent.add(obj);
			return obj;
		}
		function handleTorusGeometry(ele, parent) {
			var att = getAttributes(ele);
			//radius : Float, tube : Float, radialSegments : Integer, tubularSegments : Integer, arc : Float
			var radius = toN(att.radius, 1);
			var tube = toN(att.tube, 0.4);
			var radialSegments = toN(att.radialsegments, 8);
			var tubularSegments = toN(att.tubularsegments, 6);
			var arc = toN(att.arc, 2 * Math.PI);
			var geometry = new THREE.TorusBufferGeometry(radius, tube, radialSegments, tubularSegments, arc);
			var material = assureGeometryMat(ele);
			var obj = new THREE.Mesh(geometry, material);
			checkevents(ele, obj);
			setCommonAttributes(obj, att);
			parent.add(obj);
			return obj;
		}
		function handleFlyControls(ele) {
			var att = getAttributes(ele);
			navigating = CameraMode.FLY;
			flycontrols = new FlyControls(camera, container);

			flycontrols.movementSpeed = 3000;
			//controls.domElement = renderer.domElement;
			flycontrols.rollSpeed = Math.PI / 24;
			flycontrols.autoForward = false;
			flycontrols.dragToLook = true;
		}
		function handleOrbitControls(ele) {
			var att = getAttributes(ele);
			var enabled = toB(att.enabled, true);
			navigating = enabled ? CameraMode.ORBIT : CameraMode.FIXED;
			if (orbitControls) {
				orbitControls.reset();
			}
			else {
				orbitControls = new OrbitControls(camera, container);
			}
			orbitControls.reversed = att.reversed ? toB(att.reversed) : false;
			orbitControls.enabled = enabled;
			orbitControls.enablePan = toB(att.enablepan, true);
			orbitControls.enableZoom = toB(att.enablezoom, true);
			//controls = new OrbitControls(camera, renderer.domElement);
			var target = toV(att.target, new THREE.Vector3(0, 0.5, -20));
			if (att.maxpolarangle) {
				orbitControls.maxPolarAngle = toR(att.maxpolarangle);
			}
			if (att.minpolarangle) {
				orbitControls.minPolarAngle = toR(att.minpolarangle);
			}
			if (att.minazimuthangle) {
				orbitControls.minAzimuthAngle = toR(att.minazimuthangle);
			}
			if (att.maxazimuthangle) {
				orbitControls.maxAzimuthAngle = toR(att.maxazimuthangle);
			}
			if (att.minzoom) {
				orbitControls.minZoom = toR(att.minzoom);
			}
			if (att.maxzoom) {
				orbitControls.maxZoom = toR(att.maxzoom);
			}


			if (att.mindistance) {
				orbitControls.minDistance = toR(att.mindistance);
			}
			if (att.maxdistance) {
				orbitControls.maxDistance = toR(att.maxdistance);
			}

			orbitControls.target.set(target.x, target.y, target.z);
			//orbitControls.autoRotate = true;
			orbitControls.update();
			//orbitControls.enablePan = false;
			orbitControls.enableDamping = true;

		}
		function handleCursor3d(ele) {

			var att = getAttributes(ele);
			if (toB(att.clear)) {
				cursor3d = undefined;
			}
			else {
				addCursor3d(ele);
			}
		}
		function addCursor3d(ele) {
			var geometry = new THREE.SphereBufferGeometry(0.1);
			var material = ele ? assureGeometryMat(ele) : new THREE.MeshPhongMaterial();
			cursor3d = new THREE.Mesh(geometry, material);
			material.color.setRGB(1, 0, 0);
			cursor3d.position.z = -4;

			if (ele) {
				var att = getAttributes(ele);
				setCommonAttributes(cursor3d, att);
			}

			geometry.computeVertexNormals();
			cursor3d.draggable = true;
			cursor3d.visible = false;
			scene.add(cursor3d);
		}

		function handleCylinderGeometry(ele, parent) {
			var att = getAttributes(ele);
			//radiusTop : Float, radiusBottom : Float, height : Float, radialSegments : Integer, heightSegments : Integer, openEnded : Boolean, thetaStart : Float, thetaLength : Float
			var radiusTop = toN(att.radiustop, 1);
			var radiusBottom = toN(att.radiusbottom, 1);
			var height = toN(att.height, 1);
			var radialSegments = toN(att.radialsegments, 8);
			var heightSegments = toN(att.heightsegments, 1);
			var openEnded = toB(att.openended);
			var thetaStart = toN(att.thetastart, 0);
			var thetaLength = toN(att.thetalength, 2 * Math.PI);



			var geometry = new THREE.CylinderBufferGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
			var material = assureGeometryMat(ele);
			var obj = new THREE.Mesh(geometry, material);
			checkevents(ele, obj);
			setCommonAttributes(obj, att);
			parent.add(obj);
			return obj;
		}
		function handleModule(ele, parent){
			var att = getAttributes(ele);

			var m=document.createElement('script');
			m.src=att.url;
			m.type='module';
			document.head.appendChild(m);
			m.addEventListener('load', ()=>{
				doParseChildren(ele, parent);
			})
			
		}
		function handleDirectionalLight(ele, parent) {
			var att = getAttributes(ele);
			if (att.name) {
				var tobj = scene.getObjectByName(att.name);
				if (tobj) {
					return tobj;
				}
			}
			var light = new THREE.DirectionalLight();
			setCommonAttributes(light, att);
			if (att.target) {
				var obj = scene.getObjectByName(att.target);
				if (obj) {
					light.target = obj;
				}
			}
			checkevents(ele, light);
			parent.add(light);
			//var helper = new THREE.DirectionalLightHelper(light);
			//helper.position.set(0, 0, -2);
			//parent.add(helper);
			return light;

		}

		function handleHemisphereLight(ele, parent) {
			var att = getAttributes(ele);
			if (att.name) {
				var tobj = scene.getObjectByName(att.name);
				if (tobj) {
					return tobj;
				}
			}
			var light = new THREE.HemisphereLight();
			setCommonAttributes(light, att);
			if (att.skycolor) {
				light.skyColor = toColor(att.skycolor)
			}
			if (att.groundcolor) {
				light.groundColor = toColor(att.groundcolor)
			}
			checkevents(ele, light);
			parent.add(light);
			return light;

		}
		function handlePointLight(ele, parent) {
			var att = getAttributes(ele);
			//if (att.name) {
			//	var tobj = scene.getObjectByName(att.name);
			//	if (tobj) {
			//		return tobj;
			//	}
			//}
			var light = new THREE.PointLight();
			setCommonAttributes(light, att);
			var decay = toN(att.decay, 1);
			var distance = toN(att.distance, 0);
			light.decay = decay;
			light.distance = distance;
			checkevents(ele, light);
			parent.add(light);
			return light;

		}
		function handleAmbientLight(ele, parent) {
			var att = getAttributes(ele);
			if (att.name) {
				var tobj = scene.getObjectByName(att.name);
				if (tobj) {
					return tobj;
				}
			}
			var light = new THREE.AmbientLight();
			setCommonAttributes(light, att);
			checkevents(ele, light);
			parent.add(light);
			return light;

		}

		function handleTextGeometry(ele, parent) {
			var att = getAttributes(ele);
			if (att.name) {
				var tobj = scene.getObjectByName(att.name);
				if (tobj) {
					return tobj;
				}
			}
			var fontFile = '';
			if (att.fontfile) {
				fontFile = att.fontFile.toLowerCase();
			}

			if (fontFile.length > 0) {
				const loader = new THREE.FontLoader();
				loader.load(fontFile, function (font) {
					return createFontObj(ele, parent, font, att);
				});
			}
			else {
				var font = new THREE.Font(defaultFont.data);
				return createFontObj(ele, parent, font, att);
			}



		}
		function createFontObj(ele, parent, font, att) {
			var material = assureGeometryMat(ele);
			var text = '[no text specfied]';
			if (att.text) {
				text = att.text;
			}
			var size = toN(att.size, 1) * 60;
			var height = toN(att.height, 1) * 20;
			var curveSegments = toN(att.curvesegments, 3);
			var bevelThickness = toN(att.bevelthickness, 1);
			var bevelSize = toN(att.bevelsize, 1);
			var bevelEnabled = toB(att.bevelenabled, true);
			var textGeo = new THREE.TextGeometry(text, {

				font: font,

				size: size,
				height: height,
				curveSegments: curveSegments,

				bevelThickness: bevelThickness,
				bevelSize: bevelSize,
				bevelEnabled: bevelEnabled

			}
			);

			textGeo.computeBoundingBox();
			textGeo.computeVertexNormals();

			const triangle = new THREE.Triangle();

			// "fix" side normals by removing z-component of normals for side faces
			// (this doesn't work well for beveled geometry as then we lose nice curvature around z-axis)

			if (!bevelEnabled) {

				const triangleAreaHeuristics = 0.1 * (height * size);

				for (let i = 0; i < textGeo.faces.length; i++) {

					const face = textGeo.faces[i];

					if (face.materialIndex == 1) {

						for (let j = 0; j < face.vertexNormals.length; j++) {

							face.vertexNormals[j].z = 0;
							face.vertexNormals[j].normalize();

						}

						const va = textGeo.vertices[face.a];
						const vb = textGeo.vertices[face.b];
						const vc = textGeo.vertices[face.c];

						const s = triangle.set(va, vb, vc).getArea();

						if (s > triangleAreaHeuristics) {

							for (let j = 0; j < face.vertexNormals.length; j++) {

								face.vertexNormals[j].copy(face.normal);

							}

						}

					}

				}

			}

			const centerOffset = - 0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);

			textGeo = new THREE.BufferGeometry().fromGeometry(textGeo);

			var obj = new THREE.Mesh(textGeo, material);




			setCommonAttributes(obj, att);
			obj.scale.multiplyScalar(0.001);
			obj.position.x += centerOffset * obj.scale.x;
			checkevents(ele, obj);
			parent.add(obj);
			return obj;
		}
		function handleWater(ele, parent) {
			var att = getAttributes(ele);
			var waveScale = toN(att.wavescale, 1);
			var steepness = toN(att.steepness, 1);
			var speed = toN(att.speed, 1);
			var waterColor = toColor(att.color);
			var sundirection = toV(att.sundirection, new THREE.Vector3(1,-1,-1));
			const gerstnerWater = new GerstnerWater(waveScale, steepness, speed, waterColor, sundirection);
			const obj = gerstnerWater.water;
			setCommonAttributes(obj, att);
			parent.add(obj)

			checkObjectUpdateArray(obj);
			var f = function (delta) {
				gerstnerWater.update(delta)
			}
			obj.updateArray.push(f);
		}

		function handleSpotLight(ele, parent) {
			var att = getAttributes(ele);
			if (att.name) {
				var tobj = scene.getObjectByName(att.name);
				if (tobj) {
					return tobj;
				}
			}
			var obj = new THREE.SpotLight();
			obj.distance = 200;
			checkevents(ele, obj);
			setCommonAttributes(obj, att);
			if (att.target) {
				var objt = scene.getObjectByName(att.target);
				if (objt) {
					obj.target = objt;
				}
			}
			if (att.color) {
				obj.color = toColor(att.color);
			}

			obj.penumbra = toR(att.penumbra, 0);
			obj.angle = toR(att.angle, Math.PI / 3);
			obj.decay = toN(att.decay, 1);
			obj.distance = toN(att.distance, 0);
			parent.add(obj);
			return obj;

		}

		this.addModelInScene = function (obj, ele, parent) {
			var att = getAttributes(ele);
			setCommonAttributes(obj, att);
			obj.threemlType = 'gltfLoader';
			obj.url = att.url;
			checkevents(ele, obj);
			setEventParent(obj, obj);
			hideWaitModel(parent);
			parent.add(obj);
		}
		function checkevents(ele, obj) {
			var hasMouseEvent = false;
			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'rotate':
						handleRotate(obj, child);
						break;
					case 'pulse':
						handlePulse(obj, child);
						break;
					case 'blink':
						handleBlink(obj, child);
						break;
					case 'present':
						handlePresent(obj, child);
						hasMouseEvent = true;
						break;
					case 'link':
						handleLink(obj, child);
						hasMouseEvent = true;
						break;
					case 'event':
						handleEvent(obj, child);
						hasMouseEvent = true;
						break;

					case 'lookat':
						handleLookAt(obj, child);
						break;
					case 'walk':
						handleWalk(obj, child);
						hasMouseEvent = true;
						break;
					case 'draggable':
						handleDraggable(obj, child);
						hasMouseEvent = true;
						break;
					case 'hover':
						handleHover(obj, child);
						//hasMouseEvent = true;
						break;
					case 'media':
						handleMedia(obj, child);
						hasMouseEvent = true;
						break;
					case 'actions':
						handleActions(obj, child);
						break;
					case 'clamp':
						handleClamp(obj, child);
						break;
					case 'chain':
						handleChain(obj, child);
						break;

					case 'softbody':
						handleSoftBodies(obj, child);
						break;
					case 'synchronise':
						handleSynchronise(obj, child);
						break;
				}
			}
			return hasMouseEvent;
		}
		//function checkObjectUpdateArray(obj) {
		//	if (!obj.updateArray) {
		//		obj.updateArray = [];
		//		obj.update = function () {
		//			for (var n = 0; n < obj.updateArray.length; n++) {
		//				obj.updateArray[n].call(obj);
		//                  }
		//              }
		//          }
		//}//////////////////////////////////////////////////////////////////////


		//////////////////////////////////////////////////////////////////////////////////////////////////
		//var particles = [];
		function shuffleArray(arr) {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			console.log(arr);
		}
		////////////////////////////////////// Windarray
		function CreateWind3DArray(v) {
			var a = [];
			for (var n = 0; n < 5; n++) {
				var l = CreateWind2DArray(v);
				a.push(l);
			}
			return a;
		}
		function getR(scale = 1) {
			return Math.random() * 2 * scale - scale;
		}
		function CreateWind2DArray(v) {
			var a = [];
			for (var n = 0; n < 5; n++) {
				var b = [];
				for (var m = 0; m < 5; m++) {
					b.push(v);
				}
				a.push(b);
			}
			return a;
		}
		function AddWindlayer(prev) {
			var arr = CreateWind2DArray(0);
			for (var n = 0; n < 5; n++) {
				for (var m = 0; m < 5; m++) {
					var i1 = n > 0 ? n - 1 : 4;
					var i2 = n < 4 ? n + 1 : 0;
					var i3 = m > 0 ? m - 1 : 4;
					var i4 = m < 4 ? m + 1 : 0;
					var f = getR(0.01);
					var itp = (prev[n][m] + (prev[i1][m] + prev[i2][m] + prev[n][i3] + prev[n][i4]) / 4) / 2 + f;
					itp = itp < -1 ? -1 : itp;
					itp = itp > 1 ? 1 : itp;
					arr[n][m] = itp;
				}
			}
			return arr;
		}
		function getWindArrayFactor(obj, pos) {
			if (obj.windArray) {
				var v = pos.clone().sub(obj.minVector);
				if (!(obj.scaleVector.x == 0 || obj.scaleVector.y == 0 || obj.scaleVector.z == 0)) {
					v.x /= obj.scaleVector.x;
					v.y /= obj.scaleVector.y;
					v.z /= obj.scaleVector.z;
				}
				v.normalize().multiplyScalar(4.9);
				var x = Math.floor(Math.abs(v.x));
				var y = Math.floor(Math.abs(v.y));
				var z = Math.floor(Math.abs(v.z));
				return obj.windArray[x][y][z];
			}
			return 1;
		}
		function randomUpdateWindArray(arr) {
			if (Math.random() < 0.03) {
				updateWindlayer(arr);
			}
		}
		function updateWindlayer(arr) {
			arr.splice(0, 1);
			var nl = AddWindlayer(arr[3]);
			arr.push(nl);
		}
		function addLabel(txt) {
			var holder = new THREE.Group();
			const d = document.createElement('div');
			d.innerHtml = txt;
			d.style.backgroundColor = 'white';
			d.style.width = '40px';
			d.style.height = '20px';
			d.style.display = 'block';
			d.style.color = 'black';
			d.style.fontSize = '20px'
			//d.style.padding = '5px';
			var obj = new CSS3DObject(d);
			scene.add(obj)
			var r = toRotV('0 180 0');
			obj.rotation.set(r.x, r.y, r.z);

			holder.add(obj);

			//add transparantplane
			var geometry = new THREE.PlaneGeometry(0.07, 0.03);
			var material = new THREE.MeshBasicMaterial();
			material.color.set('black'); //red
			material.opacity = 0;
			material.blending = THREE.NoBlending;
			material.side = THREE.DoubleSide;
			var p = new THREE.Mesh(geometry, material);

			holder.add(p);
			scene.add(holder);



			return holder
		}
		//function checkBoundingVectors(obj, pos) {
		//	obj.minVector.x = obj.minVector.x < pos.x ? obj.minVector.x : pos.x;
		//	obj.minVector.y = obj.minVector.y < pos.y ? obj.minVector.y : pos.y;
		//	obj.minVector.z = obj.minVector.z < pos.x ? obj.minVector.z : pos.z;
		//	obj.maxVector.x = (obj.maxVector.x > pos.x ? obj.maxVector.x : pos.x) - obj.minVector.x;
		//	obj.maxVector.y = (obj.maxVector.y > pos.y ? obj.maxVector.y : pos.y) - obj.minVector.y;
		//	obj.maxVector.z = (obj.maxVector.z > pos.x ? obj.maxVector.z : pos.z) - obj.minVector.z;

		//}
		//////////////////////////////////////////////////////////////////////
		function simulateSoftBody(obj) {
			if (obj.particles) {
				var now = Date.now();
				var gravity;
				var windForce;
				var dragging;
				var newdragPoint;
				obj.fixarr = [];
				//shuffleArray(obj.particleIdx);
				for (var n = 0; n < obj.particleIdx.length; n++) {
					//handle constraints
					var p = obj.particles[obj.particleIdx[n]];
					if (!p.fixed) {
						var idx = p.index[0];
						var pos = getPosition(obj, idx);
						var orig = pos.clone();
						for (var x = 0; x < obj.constraints.length; x++) {
							var c = obj.constraints[x];
							switch (c.type) {
								case SoftBodyConstraint.GRAVITY:
									if (!gravity) {
										var factor = c.factor ? c.factor : 1;
										gravity = obj.worldToLocal((new THREE.Vector3(0, -9.8, 0))).multiplyScalar(0.001 * factor * delta);
									}
									pos.add(gravity);
									break;
								case SoftBodyConstraint.NORMAL:
									var normal = getNormal(obj, idx);
									var factor = c.factor ? c.factor : 1;
									pos.add(normal.multiplyScalar(0.03 * factor * delta));
									break;
								case SoftBodyConstraint.WIND:
									if (!windForce) {
										if (!obj.windArray) {
											obj.windArray = CreateWind3DArray(0);
											var bbox = new THREE.Box3().setFromObject(obj);

											obj.minVector = bbox.min;
											obj.scaleVector = bbox.max;
											obj.scaleVector.sub(bbox.min);
										}
										var factor = c.factor ? c.factor : 1;
										var scale = c.scale ? c.scale : 1;
										if (!obj.offset) {
											obj.offset = Math.random();
										}
										var period = 1000 * scale;
										if (period == 0) {
											period = 100;
										}
										var cnow = now + obj.offset * period * 7;
										const windStrength = Math.cos(cnow / (period * 7)) * 20 + 40;
										windForce = new THREE.Vector3(Math.sin(cnow / (period * 2)), Math.cos(cnow / (period * 3)), Math.sin(cnow / period));
										windForce.normalize();
										windForce.multiplyScalar(windStrength * factor * 0.001 * delta);

									}
									//checkBoundingVectors(obj, pos);
									var f = c.useArray ? getWindArrayFactor(obj, pos) : 1;
									var wf = windForce.clone();
									pos.add(wf.multiplyScalar(f));
									break;
								case SoftBodyConstraint.STRETCH:
									//distance
									var factor = c.factor ? c.factor : 1;
									for (var m = 0; m < p.children.length; m++) {
										var cidc = p.children[m];
										var cpos = getPosition(obj, cidc);
										var v = cpos.sub(pos).clone();
										var d = v.length();
										v.normalize();
										var prev_d = p.dist[m];
										var fact = prev_d - d;
										var si = Math.sign(fact);
										v.multiplyScalar(-si * (fact * fact) * factor * 0.1 * delta);
										if (v.length() > 1) {
											v.normalize().multiplyScalar(1);
										}
										pos.add(v);
									}
									break;
								case SoftBodyConstraint.STRUCTURE:
									//distance
									var factor = c.factor ? c.factor : 1;
									var cpos = p.startposition;
									pos.lerp(cpos, factor * 0.01 * delta)
									break;
								case SoftBodyConstraint.FLOOR:
									//floor
									var factor = c.factor ? c.factor : -1.5;
									if (pos.y < factor) {
										pos.x = orig.x;
										pos.y = factor;
										pos.z = orig.z;
									}
									break;
								case SoftBodyConstraint.DRAG:
									if (true) {//selectedObject && selectedObject.id == obj.id ) {
										if (!dragging) {
											if (cursor3d && cursor3d.visible) {//mouseDivX != 0 || mouseDivY != 0) {
												dragging = true;
												newdragPoint = obj.worldToLocal(cursor3d.position.clone());
											}
										}
										if (dragging) {
											var dist = newdragPoint.distanceTo(pos);
											var scale = c.scale ? c.scale : 1;
											if (fixHandle == FixHandle.TOGGLE && dist < obj.scale.x * scale) {// cursor3d.scale.x * 
												p.fixed = !p.fixed;
											}
											else {
												var tdist = dist < 0.4 ? 0.4 : dist;
												var factor = c.factor ? c.factor : 1;
												var v = 1 / Math.pow(tdist, 3)
												//if (v < 1) { v = 1;}
												pos.lerp(newdragPoint, 0.02 * factor * (v) * delta);
											}

										}
									}
									break;
								case SoftBodyConstraint.GRAB:
									if (obj.grabMode) {
										if (cursor3d && cursor3d.visible) {
											if (!newdragPoint) {
												newdragPoint = obj.worldToLocal(cursor3d.position.clone());
											}
											switch (obj.grabMode) {
												case GrabMode.NONE:
													obj.grabMode = GrabMode.INIT;

													break;
												case GrabMode.INIT:
													var dist = newdragPoint.distanceTo(pos);
													var factor = c.factor ? c.factor : 1;
													if (dist < factor) {
														p.grabVector = pos.clone().sub(newdragPoint);
													}
													break;
												case GrabMode.DRAG:
													if (p.grabVector) {
														if (fixHandle == FixHandle.TOGGLE) {
															p.fixed = !p.fixed;
														}
														pos = newdragPoint.add(p.grabVector);
													}
											}
										}
										else {
											obj.grabMode = GrabMode.NONE;
											p.grabVector = undefined;
										}

									}


									break;
							}

						}
						if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z) || orig.distanceTo(pos) > 10) {
							pos = orig;

						}
						for (var m = 0; m < p.index.length; m++) {
							var i = p.index[m];
							obj.geometry.attributes.position.setXYZ(i, pos.x, pos.y, pos.z);
						}
						//if (!p.label) {
						//	p.label = addLabel(p.index[0]);
						//}
						//var labelpos = obj.localToWorld(pos);
						//p.label.position.set(labelpos.x, labelpos.y, labelpos.z);
					}
					else {
						obj.fixarr.push(p.index[0]);
					}
				}
				if (obj.grabMode && obj.grabMode == GrabMode.INIT) {
					obj.grabMode = GrabMode.DRAG;
				}
				//console.log(fixarr.join(' '));
				obj.geometry.attributes.position.needsUpdate = true;
				obj.geometry.computeVertexNormals();
				obj.geometry.computeBoundingBox();

				if (obj.windArray) {
					randomUpdateWindArray(obj.windArray);
				}
			}
		}

		this.checkRepeat = function (ele, obj, parent) {
			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'repeat':
						return handleRepeat(obj, child, ele, parent);
						break;
				}
			}
			threescene.addModelInScene(obj, ele, parent);
		}

		function handleRepeat(obj, ele, parentele, parent) {
			var att = getAttributes(ele);

			var number = toN(att.number, 1);
			var maxpos = toV(att.maxposition, new THREE.Vector3());
			var maxrot = toV(att.maxrotation, new THREE.Vector3());
			var minscale = toV(att.minscale, new THREE.Vector3(1, 1, 1));
			var maxscale = toV(att.maxscale, new THREE.Vector3(1, 1, 1));

			for (var n = 0; n < number; n++) {
				var nobj = obj.clone();
				threescene.addModelInScene(nobj, parentele, parent);
				//position
				nobj.position.add(getRandomVector(maxpos));
				//rotation
				var nrot = getRandomVector(maxrot);
				nobj.rotation.x = toR(nrot.x);
				nobj.rotation.y = toR(nrot.y);
				nobj.rotation.z = toR(nrot.z);
				//scale
				nobj.scale.set(getRandowScaleP(minscale.x, maxscale.x), getRandowScaleP(minscale.y, maxscale.y), getRandowScaleP(minscale.z, maxscale.z));

			}
		}
		function getRandowScaleP(mins, maxs) {
			return mins + (maxs - mins) * Math.random();
		}
		function getRandomVector(maxv) {
			return new THREE.Vector3((0.5 - Math.random()) * maxv.x, (0.5 - Math.random()) * maxv.y, (0.5 - Math.random()) * maxv.z);
		}
		function handleSoftBodies(obj, ele) {
			if (obj.geometry) {
				handleSoftBody(obj, ele);
			}
			if (obj.children) {
				for (var n = 0; n < obj.children.length; n++) {
					handleSoftBodies(obj.children[n], ele);
				}
			}
		}
		function getUrlRoot() {
			let url = window.location.href;
			let p = url.indexOf('//') + 2
			p = url.indexOf('/', p);
			return url.substring(0, p);
        }
		function handleStat() {
			let urlRoot = getUrlRoot();
			let url = urlRoot+'/api_stat?p=' + window.location.href

			let xhr = new XMLHttpRequest();
			xhr.open('get', url);
			xhr.send();
			xhr.onload = function () { }

        }
		function handleSoftBody(obj, ele) {
			//var att = getAttributes(ele);

			obj.particles = [];
			obj.constraints = [];

			//fill particles
			for (var n = 0; n < obj.geometry.index.count; n = n + 3) {
				var idx0 = obj.geometry.index.array[n];
				var idx1 = obj.geometry.index.array[n + 1];
				var idx2 = obj.geometry.index.array[n + 2];
				assureParticle(obj, idx0, idx1, idx2);
				assureParticle(obj, idx1, idx2, idx0);
				assureParticle(obj, idx2, idx0, idx1);
			}
			//set default distances and particleIdx
			obj.particleIdx = [];
			for (var n = 0; n < obj.particles.length; n++) {
				var p = obj.particles[n]
				var idx = p.index[0];
				var pos = getPosition(obj, idx);
				for (var m = 0; m < p.children.length; m++) {
					var cidc = p.children[m];
					var cpos = getPosition(obj, cidc);
					var d = cpos.distanceTo(pos);
					p.dist.push(d);
				}


				obj.particleIdx.push(n);
			}
			//check constraints
			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'constraint':
						handleConstraint(obj, child);
						break;
				}
			}
		}
		function handleConstraint(obj, ele) {
			var att = getAttributes(ele);
			var t = att.type;
			var factor = att.factor?toN(att.factor): undefined;
			var scale = toN(att.scale, 1);
			var useArray = toB(att.usearray);
			var c = {
				factor: factor,
				scale: scale
			}
			switch (t) {
				case 'fixed':
					return handleFilex(obj, att);
					break;
				case 'gravity':
					c.type = SoftBodyConstraint.GRAVITY;
					//c.factor = factor;
					break;
				case 'normal':
					c.type = SoftBodyConstraint.NORMAL;
					break;
				case 'stretch':
					c.type = SoftBodyConstraint.STRETCH;
					break;
				case 'wind':
					c.type = SoftBodyConstraint.WIND;
					c.useArray = useArray;
					break;
				case 'floor':
					c.type = SoftBodyConstraint.FLOOR;
					break;
				case 'structure':
					c.type = SoftBodyConstraint.STRUCTURE;
					break;
				case 'drag':
					c.type = SoftBodyConstraint.DRAG;
					checkCursor3d();
					break;
				case 'grab':
					c.type = SoftBodyConstraint.GRAB;
					obj.grabMode = GrabMode.NONE;
					checkCursor3d();
					break;
			}
			obj.constraints.push(c);

		}

		function checkCursor3d() {
			if (!cursor3d) {
				addCursor3d();
			}
		}
		function handleFilex(obj, att) {
			var tfixedIdx = att.index ? att.index.split(' ') : [];
			var fixedIdx = [];
			for (var x = 0; x < tfixedIdx.length; x++) {
				fixedIdx.push(Number(tfixedIdx[x]));
			}
			var gpos = att.position ? toV(att.position) : undefined;
			for (var n = 0; n < obj.particles.length; n++) {
				var p = obj.particles[n];
				for (var o = 0; o < p.index.length; o++) {

					var fixed = isFixed(p.index[o], fixedIdx);
					if (fixed) {
						p.fixed = true;
						if (gpos) {
							obj.updateMatrixWorld();
							gpos.add(obj.position);
							var pos = obj.worldToLocal(gpos);
							p.startposition.set(pos.x, pos.y, pos.z);
							for (var r = 0; r < p.index.length; r++) {
								var i = p.index[r];
								obj.geometry.attributes.position.setXYZ(i, pos.x, pos.y, pos.z);
							}
							obj.geometry.attributes.position.needsUpdate = true;
							obj.geometry.computeVertexNormals();

						}
						break;
					}
				}
			}
		}
		function isFixed(idx, fixedIdx) {
			for (var o = 0; o < fixedIdx.length; o++) {
				if (fixedIdx[o] == idx) {
					return true;
				}
			}
		}
		function getNormal(obj, index) {
			var idx = 3 * index;
			var x = obj.geometry.attributes.normal.array[idx];
			var y = obj.geometry.attributes.normal.array[idx + 1];
			var z = obj.geometry.attributes.normal.array[idx + 2];
			return new THREE.Vector3(x, y, z);
		}

		function getPosition(obj, index) {
			var idx = 3 * index;
			var x = obj.geometry.attributes.position.array[idx];
			var y = obj.geometry.attributes.position.array[idx + 1];
			var z = obj.geometry.attributes.position.array[idx + 2];
			return new THREE.Vector3(x, y, z);
		}
		function findParticle(obj, pos) {
			for (var n = 0; n < obj.particles.length; n++) {
				if (obj.particles[n].startposition.clone().distanceTo(pos) < 0.01) {
					return obj.particles[n];
				}
			}
		}
		function findChild(p, idx) {
			for (var n = 0; n < p.children.length; n++) {
				if (p.children[n] == idx) {
					return p.children[n];
				}
			}
		}
		function assureChild(p, idx) {
			var c = findChild(p, idx);
			if (!c) {
				p.children.push(idx);
			}
		}
		function assureParticle(obj, index, child0, child1) {

			var pos = getPosition(obj, index)
			var p = findParticle(obj, pos);
			if (!p) {

				p = {
					index: [],
					children: [],
					dist: [],
					startposition: pos
				}
				p.index.push(index);
				obj.particles.push(p);
			}
			else {
				if (!hasItem(index, p.index)) {
					p.index.push(index);
				}
			}
			assureChild(p, child0);
			assureChild(p, child1);

			return p;
		}
		function hasItem(item, arr) {
			for (var n = 0; n < arr.length; n++) {
				if (arr[n] == item) {
					return true;
				}
			}
		}
		//////////////////////////////////////////////////////////////////////////////////////
		// Copys the world transforms between objects even if the have different parents
		var copyTransform = (function () {
			var scratchMat = new THREE.Matrix4();
			return function (source, destination) {
				destination.matrix.copy(source.matrixWorld);
				destination.applyMatrix(scratchMat.getInverse(destination.parent.matrixWorld));
				return destination.quaternion;
			}
		})();
		async function handleMedia(obj, ele) {
			var att = getAttributes(ele);

			var f = function () {
				activateAudio(obj, att);
			}
			addCallbackFunction(obj, f);
			if (att.volumetric && toB(att.volumetric)) {
				checkObjectUpdateArray(obj);
				var f2 = function () {
					if (audioContext && obj.sound) {

						var p = getWorldPosition(obj);
						obj.sound.panner.setPosition(p.x, p.y, p.z);

						var p = new THREE.Vector3();
						p.setFromMatrixPosition(camera.matrixWorld);
						// And copy the position over to the listener.
						audioContext.listener.setPosition(p.x, p.y, p.z);

					}
				}
				obj.updateArray.push(f2);
			}
		}
		function getElementInnerCode(ele) {
			var scr = ele.innerHTML;
			scr = scr.replaceAll('<!--', '').replaceAll('-->', '');
			return scr;
        }
		function handleEvent(obj, ele) {
			var att = getAttributes(ele);
			var type = att.type;
			var f;
			var scr = getElementInnerCode(ele);
			switch (type) {
				case 'click':
					f = function (obj) {
						if (!(event.shiftKey || event.altKey ||event.ctrlKey)) {
							eval(scr);
						}
					
					}
					break;
				case 'shift-click':
					f = function (obj) {
						if (event.shiftKey) {
							eval(scr);
						}
					}
					break;
				case 'ctrl-click':
					f = function (obj) {
						if (event.ctrlKey) {
							eval(scr);
						}
					}
					break;
				case 'alt-click':
					f = function (obj) {
						if (event.altKey) {
							eval(scr);
						}
					}
					break;
				case 'left-click':
					f = function (obj) {
						if (event.button == 0) {
							eval(scr);
						}
					}
					break;
				//case 'middle-click':
				//	f = function () {
				//		if (event.button == 1) {
				//			event.preventDefault();
				//			eval(scr);
				//		}
				//	}
				case 'right-click':
					f = function (obj) {
						if (event.button == 2) {
							event.preventDefault();
							eval(scr);
							return false;
						}
					}
					break;
			}
			if (f) {
				addCallbackFunction(obj, f);
			}
		}
		function getDynamicTextureMaterial(ele) {
			var att = getAttributes(ele);
			var text = toT(att.text, '');
			var width = toN(att.width, 512);
			var height = toN(att.height, 512);
			var font = toT(att.font, 'Verdana');
			var fontSize = toN(att.fontsize, 20);
			var fontWeight=toT(att.fontweight, 'bolder')
			var fontstring = fontWeight + ' ' + fontSize + 'px ' + font;
			var fontColor = toT(att.fontcolor, 'red')
			var backgroundColor = toT(att.backgroundcolor, 'cyan')
			var lineHeight = toN(att.lineheight, 0.1)
			var margin = toN(att.margin, 0.1)

			var options = {
				"text" : text,
				"font": fontstring,
				"fillStyle": fontColor,
				"lineHeight": lineHeight,
				"margin": margin
			};

			//text, undefined, height / 2, fontColor
			var dynamicTexture = new THREEx.DynamicTexture(width, height)
			dynamicTexture.context.font = fontstring;
			dynamicTexture.texture.anisotropy = renderer.getMaxAnisotropy();
			dynamicTexture.clear(backgroundColor)
				.drawTextCooked(options);
			var material = new THREE.MeshBasicMaterial({
				map: dynamicTexture.texture
			});
			return material;
		}
		function handleMobileMessage(obj, ele) {
			var att = getAttributes(ele);
			var text = toT(att.text, 'This page is not suitable to use on a mobile device. Please use a computer.')
			if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ||
				(/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.platform))) {
				showWarning(text);
			}
        }
		function handleLink(obj, ele) {
			var att = getAttributes(ele);
			if (att.url) {
				var f = function () {
					if (!(event.shiftKey || event.ctrlKey || event.altKey)){
						if (att.target) {
							//
							var iFrameExist = document.querySelector(`iframe[name="${att.target}"]`);
							if (iFrameExist || att.target == "_blank" || att.target == "_self") {
								window.open(att.url, att.target);
							}
							else {
								var replace = att.replace ? att.replace : false;
								var handler = self;
								if (att.handler) {
									var thandler = eval(att.handler);
									if (thandler) {
										handler = thandler;
									}
								}
								handler.loadInTarget(att.target, att.url , replace);
							}
						}
						else {
							window.top.location.href = att.url;
						}
					}

				}
				addCallbackFunction(obj, f);
			}

		}
		function addCallbackFunction(obj, f, action = 'click') {
			var cb = makeCallBackObj(f, action);
			if (!obj.callbackFunctions) {
				obj.callbackFunctions = [];
				obj.callback = function (action) {
					for (var n = 0; n < obj.callbackFunctions.length; n++) {
						var c = obj.callbackFunctions[n];
						if (c.f && c.t == action) { c.f(); }
					}
				}
			}
			obj.callbackFunctions.push(cb);
		}
		function handleRemotePresent(obj, att) {


			addCallbackFunction(obj, function () {
				var remObj = scene.getObjectByName(att.target);
				if (remObj && remObj.present) {
					remObj.present(!remObj.presentProp.isPresenting);
				}
			});

		}

		function handlePresent(obj, ele) {
			var att = getAttributes(ele);
			checkObjectUpdateArray(obj);
			if (att.target) {
				return handleRemotePresent(obj, att);
			}
			var speed = toN(att.speed, 0.01);
			var cameradistance = toN(att.cameradistance, 1);

			var fromgroup;
			if (att.fromgroup) {
				fromgroup = scene.getObjectByName(att.fromgroup);
			}
			obj.presentProp = {};

			obj.presentProp.speed = speed;
			obj.presentProp.cameradistance = cameradistance;
			obj.presentProp.defaultPosition = obj.position.clone();
			obj.presentProp.isPresenting = false;
			obj.presentProp.isRunning = false;
			obj.presentProp.forward = new THREE.Vector3(0, 0, 1);
			obj.presentProp.defaultQuaternion = obj.quaternion.clone();
			var f = function () {
				if (obj.presentProp.isRunning) {
					//obj.presentProp.steps--;
					var parent = obj.parent;
					var go = new THREE.Object3D();
					go.quaternion.x = camera.quaternion.x;
					go.quaternion.y = camera.quaternion.y;
					go.quaternion.z = camera.quaternion.z;
					go.quaternion.w = camera.quaternion.w;

					go.position.x = camera.position.x;
					go.position.y = camera.position.y;
					go.position.z = camera.position.z;
					parent.attach(go);

					var vec = new THREE.Vector3(0, 0, -cameradistance);

					vec.applyQuaternion(go.quaternion);

					var target = go.position.clone();
					var source = obj.presentProp.defaultPosition.clone();
					var tocamera = target.clone().sub(source);
					tocamera.normalize();
					target.add(vec);

					var targetQuaternion = go.quaternion.clone();

					if (!obj.presentProp.isPresenting) {
						var target = obj.presentProp.defaultPosition.clone();
						source = obj.position.clone();
						targetQuaternion = obj.presentProp.defaultQuaternion.clone();
					}
					var direction = target.clone();
					var previousPos = obj.position.clone();
					obj.position.lerp(direction, speed*delta);
					var checkDistance = obj.position.distanceTo(previousPos);
					obj.quaternion.slerp(targetQuaternion, 2 * obj.presentProp.speed * delta)
					var distanceTo = obj.position.distanceTo(target);
					//console.log(target.x + ' ' + target.y + ' ' + target.z + '---- ' + source.x + ' ' + source.y + ' ' + source.z + ' distanceTo:' + distanceTo);
					if (distanceTo < checkDistance * 2) {
						obj.position.set(target.x, target.y, target.z);
						obj.presentProp.isRunning = false;
						console.log(obj.name + ' stopped');

					}
					parent.remove(go);
				}
			}
			obj.updateArray.push(f);
			obj.present = function (doPresent) {
				if (fromgroup && doPresent) {
					for (var n = 0; n < fromgroup.children.length; n++) {
						if (obj.name != fromgroup.children[n].name && fromgroup.children[n].presentProp && fromgroup.children[n].presentProp.isPresenting) {
							fromgroup.children[n].present(false);
						}
					}
				}
				obj.presentProp.isPresenting = doPresent;
				obj.presentProp.isRunning = true;
				if (obj.children.length > 0) {
					obj.children[0].element.style.zIndex = obj.presentProp.isPresenting ? 10 : canvaszindex - 1;
				}

				
			}
			if (obj.children.length > 0 && obj.children[0].element) { //is htmlPanel
				var c = obj.children[0].element.children;
				if (c && c.length > 0 && c[0].children.length > 0 && c[0].children[1].name == 'handle') {
					var d = c[0].children[1];
					if (att.presentfromgroup == 'true' && obj.parent.name && obj.name) {
						d.addEventListener("click", function () {
							event.stopPropagation();
							if (!obj.presentProp.isPresenting) {
								threeml.presentFromGroup(obj.parent.name, obj.name);
							}
							else {
								obj.present(!obj.presentProp.isPresenting);
							}

						});
					}
					else {
						d.addEventListener("click", function () {
							event.stopPropagation();
							obj.present(!obj.presentProp.isPresenting);
						});
					}
					d.style.display = 'block';
					if (att.class) {
						d.classList.add(att.class);
					}
					if (att.handlecolor) {
						d.style.backgroundColor = att.handlecolor;
					}
				}
			}
			else {
				addCallbackFunction(obj, function () {
					obj.present(!obj.presentProp.isPresenting);
				});
				//obj.callback = function () {  }
			}
			if (att.atstart == 'true') {
				obj.presentProp.isPresenting = true;
				obj.presentProp.isRunning = true;
				if (obj.children.length > 0) {
					obj.children[0].element.style.zIndex = 10;
				}
			}
		}
		function handleDraggable(obj, child) {
			obj.draggable = true;
		}
		function handleWalk(obj, ele) {
			obj.walk = true;
		}
		function handleHover(obj, ele) {
			var att = getAttributes(ele);
			handleHoverAtt(obj, att);
		}
		function handleHoverAtt(obj, att) {
			function assureHoverAction(o, action) {
				if (o.hoveractions.indexOf(action) == -1) {
					o.hoveractions += action;
				}
			}
			var f = function () {
				var action = toT(att.action, 'show');
				var text = toT(att.text, undefined);
				var factor = toN(att.factor, 1.2);
				var atmouse = toB(att.atmouse, true);
				var o = obj;
				var t;
				if (hoverObject) {
					if (hoverObject.o == obj) {
						t = hoverObject.t;
					}
					else {
						clearHover(container);
					}
				}
				if (!t && att.target) {
					t = scene.getObjectByName(att.target);
				}

				if (o) {
					if (!o.hoveractions) {
						o.hoveractions = '';
					}
					if (action == 'show' && att.target) {
						t.visible = true;
						assureHoverAction(o, 'show');
					}
					else if (action == 'scale' && !o.scaled) {
						if (!o.defaultScale) {
							o.defaultScale = o.scale.clone();
						}
						o.scale.multiplyScalar(factor);
						assureHoverAction(o, 'scale');
						o.scaled = true;
					}
					else if (action == 'color' && !o.colored) {
						if (!o.defaultColor) {
							o.defaultColor = o.material.color.clone();
						}
						var hoverColor = toColor(att.color, new THREE.Color(1, 1, 1));
						o.material.color = hoverColor;;
						assureHoverAction(o, 'color');
						o.colored = true;
					}
					else if (action = 'tooltip' && text) {
						o.hoverText = text;
						var hd = assureHoverDiv(container);
						hd.innerHTML = o.hoverText;
						hd.style.display = 'block';
						hd.style.color = 'black';
						if (atmouse && mousePos) {
							var x = mousePos.x + 50;
							var yDiv = mousePos.y > 70 ? -50 : 50;
							var y = mousePos.y + yDiv;

							hd.style.top = y + 'px';
							hd.style.left = x + 'px';
						}
						assureHoverAction(o, 'tooltip');
					}
					hoverObject = {
						o: o,
						t: t
					}

				}

			}

			addCallbackFunction(obj, f, 'hover')
		}
		function handleActions(obj, ele) {
			var att = getAttributes(ele);
			var targetName = att.target;
			var target;
			if (targetName) {
				target = getTarget(targetName);
			}

			obj = target ? target : obj;
			assureActionProp(obj, ele);

			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'action':
						handleAction(obj, child);
						break;
				}
			}
		}
		function assureActionProp(obj, ele) {
			var att = getAttributes(ele);
			if (!obj.act) {
				obj.act = {};
				obj.act.active = true;
				obj.act.current = 0;
				obj.act.actions = [];
				checkObjectUpdateArray(obj);
				var f = function () {
					if (obj.act && obj.act.active) {
						if (obj.act.actions.length > obj.act.current) {
							var r = obj.act.actions[obj.act.current].call(obj);
							if (r) {
								if (obj.act.actions.length > obj.act.current + 1) {
									obj.act.current++;
								}
								else if (att && att.repeat) {
									obj.act.current = 0;
								}
								else {
									obj.act.active = false;
								}
							}
						}
					}
				}
				obj.updateArray.push(f);
			}

			obj.act.repeat = toB(att.repeat, false);
		}

		function getTarget(targetName) {
			return scene.getObjectByName(targetName);
		}
		function setVisible(obj, visible) {
			obj.visible = visible;
			if (obj.children) {
				for (var i = 0; i < obj.children.length; i++) {
					setVisible(obj.children[i], visible);
				}
			}
		}
		function handleAction(obj, ele) {
			var att = getAttributes(ele);
			var speed = toN(att.speed, 0.01);
			var targetName = att.target;
			var target;
			if (targetName) {
				target = getTarget(targetName);
			}
			var visible = att.visible;

			var t = target ? target : obj;
			if (att.typeof || att.type) {
				var ty = att.typeof ? att.typeof : att.type;
				switch (ty) {
					case 'transform':
						var q = t.quaternion.clone();
						var dorotation = att.rotation
						if (dorotation) {
							var rotation = toV(att.rotation);
							rotation.multiplyScalar(Math.PI / 180);
							var euler = (new THREE.Euler()).setFromVector3(rotation, 'XYZ');
							var q = (new THREE.Quaternion()).setFromEuler(euler)
						}
						var position = toV(att.position, t.position.clone());
						var scale = toV(att.scale, t.scale.clone());
						var color = toColor(att.color, t.color);
						var intensity = att.intensity?toN(att.intensity):undefined;

						var f = function () {
							//visible
							if (visible) {
								var v = toB(visible);
								setVisible(t, v);
							}
							//rotation
							t.quaternion.slerp(q, speed);
							var a = dorotation ? t.quaternion.angleTo(q) : 0;
							if (dorotation && a < 0.01) {
								t.quaternion.copy(q);
                            }
							//position
							t.position.lerp(position, speed);
							var p = position.distanceTo(t.position);
							//scale
							t.scale.lerp(scale, speed);
							var s = scale.distanceTo(t.scale);
							//color
							var cr = true;

							if (color && (t.material && t.material.color || t.color)) {
								var co = t.color ? t.color : t.material.color;
								co.lerp(color, speed);
								var c = co;
								var v1 = new THREE.Vector3(c.r, c.g, c.b);
								var v2 = new THREE.Vector3(color.r, color.g, color.b);

								var d = v1.distanceTo(v2);
								cr = d < 0.02;
							}
							//intensity
							var int = true;
							if (obj.intensity && intensity) {
								var dif = obj.intensity - intensity;
								if (Math.abs(dif) < 0.01) {
									obj.intensity = intensity;
									int = true;
								}
								else {
									obj.intensity -= Math.sign(dif) * speed * 1;
									int = false;
								}
							}

							return a < 0.01 && p < 0.02 && s < 0.02 && cr && int;
						}
						obj.act.actions.push(f);
						break;

					case 'click':
						var f = function () {
							t.act.active = false;
							return true;
						}
						t.act.actions.push(f);
						var f2 = function () {
							t.act.active = true;
						}
						addCallbackFunction(t, f2);
						break;
					case 'pause':
						var f = function () {
							//t.visible = visible ? toB(visible) : true;
							if (!obj.act.pause || obj.act.pause <= 0) {
								obj.act.pause = 1;
							}
							obj.act.pause -= speed * 0.1;
							return obj.act.pause < 0;
						}

						obj.act.actions.push(f);
						break;
					case 'code':
						var src = getElementInnerCode(ele);
						var f = function () {
							eval(src);
							t.act.active = false
						};
						t.act.actions.push(f);
						break;
					case 'link':
						if (att.url) {
							var f = function () {
								if (att.target) {
									//
									var iFrameExist = document.querySelector(`iframe[name="${att.target}"]`);
									if (iFrameExist || att.target == "_blank" || att.target == "_self") {
										window.open(att.url, att.target);
									}
									else {
										var replace = att.replace ? att.replace : false;
										var handler = self;
										if (att.handler) {
											var thandler = eval(att.handler);
											if (thandler) {
												handler = thandler;
											}
										}
										handler.loadInTarget(att.target, att.url, replace);
									}
								}
								else {
									window.top.location.href = att.url;
								}
							}
							obj.act.actions.push(f);

						}
						break;
					case 'camera':
						var pos;;
						if (att.position) {
							pos = toV(att.position);
						}
						var lookat;
						if (att.lookat) {
							lookat = toV(att.lookat);
						}
						var speed = toN(att.speed, 0.01);
						//obj.posDefault = pos;
						//obj.pos = obj.posDefault;
						obj.targetStepDefault = Math.floor(3 / speed);
						obj.targetStep = obj.targetStepDefault;
						obj.lookatSet = false;
						obj.positionFinished = false;
						obj.rotationFinished = false;
						var ta;

						//obj.targetPosition = pos;
						var f = function () {
							//if (obj.targetStep > 0) {
							obj.targetStep--;
							if (pos) {

								if (camera.position.distanceTo(pos) < 0.1 || obj.targetStep < 0) {
									obj.positionFinished = true;
								}
								else {
									camera.position.lerp(pos, speed);
								}
							}
							else {
								obj.positionFinished = true;
							}
							if (lookat) {
								if (!obj.lookatSet && navigating == CameraMode.ORBIT && orbitControls) {
									orbitControls.target.copy(lookat.clone());
									obj.lookatSet = true;
								}

								if (lookat) {
									if (!ta) {
										ta = threeml.getCameraDefaultLookAtDummy()
										//ta.position = target.clone();
									}
									ta.position.lerp(lookat, speed);
									
										var d = lookat.distanceTo(ta.position);
										if (d < 0.1) {
											//ta.dispose();
											//ta = undefined;
											obj.rotationFinished = true;

										}
									
								}
							}
							else {
								//camera.lookAt = undefined;
								obj.rotationFinished = true;
							}
							if ((obj.positionFinished && obj.rotationFinished) || obj.targetStep<0) {
								obj.positionFinished = false;
								obj.rotationFinished = false;
								obj.targetStep = obj.targetStepDefault;
								t.act.active = false
								obj.lookatSet = false;
								return true;
                               }
							//}
                        }


						obj.act.actions.push(f);
						break;
					case 'media':
						var f=function(){
								activateAudio(obj, att);
								obj.mediastarted=true;
							return true;
						}
						obj.act.actions.push(f);
						break;
					}
			}
		}
		function makeCallBackObj(f, t) {
			var c = {
				f: f,
				t: t
			}
			return c;
		}
		function handleFog(ele) {
			var att = getAttributes(ele);
			//const near = att.near ? toN(att.near) : 0.1;
			//const far = att.far ? toN(att.far) : 5;
			const color = toColor(att.color, new THREE.Color('lightblue'));
			const density = toN(att.density, 0.00025);
			if (density == 0) {
				scene.fog = null;
				scene.color = null;
			}
			else {
				scene.fog = new THREE.FogExp2(color, density);
				scene.background = color;
			}
		}
		function handleLookAt(obj, ele) {
			var att = getAttributes(ele);
			checkObjectUpdateArray(obj);
			var t = att.target ? scene.getObjectByName(att.target) : camera;
			if (t && t.position) {
				var f = function () {
					obj.lookAt(t.position);
				}
				obj.updateArray.push(f);
			}
			else {
				console.log("Object '" + att.target + "' not found as suitable target.")
			}
		}
		function handleBlink(obj, ele) {
			var att = getAttributes(ele);
			checkObjectUpdateArray(obj);
			var speed = toN(att.speed, 0.01);
			var random = toB(att.random, false);
			obj.blink = {};
			obj.blink.speed = speed;
			obj.blink.random = random;
			obj.blink.time = 0;
			obj.blink.fact = 1;
			var f = function () {
				obj.blink.time += speed;
				if (obj.blink.time > obj.blink.fact) {
					obj.blink.time = 0;
					obj.visible = !obj.visible
					if (random) {
						obj.blink.fact = Math.random();
					}
				}
			}
			obj.updateArray.push(f);
		}
		function handleChain(obj, ele) {
			var att = getAttributes(ele);
			checkObjectUpdateArray(obj);
			var distance = toN(att.distance, 1);
			var speed = toN(att.speed, 0.01);
			var mode = toT(att.mode, 'defined');
			obj.chain = {};
			obj.chain.distance = distance;
			obj.chain.speed = speed;
			obj.chain.dist = [];
			var f = function () {
				if (obj.chain) {
					if (mode == 'auto') {//initiate 2d arrau for distances
						var tarr=[]
						for (var n = 0; n < obj.children.length; n++) {
							tarr.push(-1);
                        }
						for (var m = 0; m < obj.children.length; m++) {
							obj.chain.dist.push([...tarr]);
						}
					}
					for (var n = 0; n < obj.children.length; n++) {//get children
						var child1 = obj.children[n];
						child1.newPosition = new THREE.Vector3();
						child1.newPositionCnt = 0;
						if (child1 != selectedObject && (!child1.presentProp || (!child1.presentProp.isRunning && !child1.presentProp.isPresenting))) {
							for (var m = 0; m < obj.children.length; m++) {//get children
								var child2 = obj.children[m];
								if (child1.id != child2.id && (!child2.presentProp || (!child2.presentProp.isRunning && !child2.presentProp.isPresenting))) {
									if (mode != 'link' || Math.abs(n - m) == 1) {
										checkDistance(obj.chain, child1, child2, n, m, mode);
									}
								}
							}
						}
					}
					for (var n = 0; n < obj.children.length; n++) {
						var child1 = obj.children[n];
						if (child1.newPositionCnt > 0) {
							if (child1 != selectedObject && (!child1.presentProp || (!child1.presentProp.isRunning && !child1.presentProp.isPresenting))) {
								var p = child1.newPosition.multiplyScalar(1 / child1.newPositionCnt);
								child1.position.lerp(p, speed);
								if (child1.position.z > 0) {
									console.log('Position: ' + Vector3ToString(child1.position) + ' New position: ' + Vector3ToString(p));
								}
							}
						}
					}
				}
			}
			obj.updateArray.push(f);


		}
		//function getShuffledArray(len) {
		//	var a = [];
		//	for (var i = 0; i<len; i++) {
		//		a.push(i);
		//	}
		//	return shuffleArray(a);
  //      }
		//function shuffleArray(arr) {
		//	for (let i = arr.length - 1; i > 0; i--) {
		//		const j = Math.floor(Math.random() * (i + 1));
		//		[arr[i], arr[j]] = [arr[j], arr[i]];
		//	}
		//	return arr;
		//}
		function checkDistance(chain, child1, child2, n, m, mode) {
			var d = child1.position.clone().sub(child2.position);
			var le = d.length()
			var distance = chain.distance;
			if (mode == 'auto') {
				if (chain.dist[n][m]==-1) {
					chain.dist[n][m] = le;
					chain.dist[m][n] = le;
				}
				distance = chain.dist[n][m];
			}

			if (Math.abs(le - distance) > 0.01) {
				d.normalize().multiplyScalar(distance);
				var r = child2.position.clone().add(d);
				//var d2 = r.clone().sub(child2.position);
				//if (d2.length() < le) {
				child1.newPosition.add(r);
				child1.newPositionCnt++;
				//}
			}
		}
		function handleClamp(obj, ele) {
			var p = obj.position.clone();
			p.sub(camera.position);
			obj.clamp = p;
			checkObjectUpdateArray(obj);
			var f = function () {
				//if (!obj.presentProp || obj.presentProp.isPresenting == false) {
				//var p = obj.clamp.clone().add(camera.position);
				var p = camera.position.clone();
				var forward = new THREE.Vector3(0, 0, - 1);
				forward.add(obj.clamp);

				forward.applyQuaternion(camera.quaternion);

				p.add(forward);
				//p.add(obj.clamp);
				obj.position.set(p.x, p.y, p.z);
				//}
			}
			obj.updateArray.push(f);
		}

		function handlePulse(obj, ele) {
			var att = getAttributes(ele);
			checkObjectUpdateArray(obj);
			var speed = toN(att.speed, 0.01);
			var maxFactor = toN(att.maxfactor, 1.5);
			obj.pulse = {};
			obj.pulse.speed = speed;
			obj.pulse.maxFactor = maxFactor;
			obj.pulse.factor = 1;
			obj.pulse.defaultScale = obj.scale.clone();
			var f = function () {
				obj.pulse.factor += obj.pulse.speed;
				var f = obj.pulse.factor;
				obj.scale.x = obj.pulse.defaultScale.x * f;
				obj.scale.y = obj.pulse.defaultScale.y * f;
				obj.scale.z = obj.pulse.defaultScale.z * f;
				if ((obj.pulse.speed > 0 && obj.pulse.factor > obj.pulse.maxFactor)
					|| (obj.pulse.speed < 0 && obj.pulse.factor < 1)) {
					obj.pulse.speed = -obj.pulse.speed;
				}


			}
			obj.updateArray.push(f);
		}

		function handleSynchronise(obj, ele) {
			checkObjectUpdateArray(obj);
			var att = getAttributes(ele);
			var t = att.type ? att.type.toLowerCase() : 'seconds';
			var f;
			switch (t) {
				case 'minutes':
					f = function () {
						var t = new Date();
						var s = t.getMinutes();
						obj.rotation.z = -(s / 60) * 2 * Math.PI;
					}
					break;
					
				case 'hours':
					f = function () {
						var t = new Date();
						var s = t.getHours() + (t.getMinutes()/60);
						s = s >= 12 ? s - 12 : s;
						obj.rotation.z = -(s / 12) * 2 * Math.PI;
					}
					break;
				default:
					f = function () {
						var t = new Date();
						var s = t.getSeconds();
						obj.rotation.z = -(s / 60) * 2 * Math.PI;
					}
					break;
           }
			obj.updateArray.push(f);
		}
		function handleRotate(obj, ele) {
			checkObjectUpdateArray(obj);
			var att = getAttributes(ele);
			var v = toV(att.axis, new THREE.Vector3(0, 0.01, 0));

			var f = function () {
				obj.rotation.x += v.x;
				obj.rotation.y += v.y;
				obj.rotation.z += v.z;
			};
			obj.updateArray.push(f);
		}

		this.addUpdateFunction = function (obj, f) {
			checkObjectUpdateArray(obj);
			obj.updateArray.push(f);
		}
		function assureGeometryMat(ele) {

			for (var n = 0; n < ele.children.length; n++) {
				var child = ele.children[n];
				var name = child.localName;
				switch (name) {
					case 'meshphongmaterial':
						return handleMeshPhongMaterial(child);
					case 'meshbasicmaterial':
						return handleMeshBasicMaterial(child);
					case 'videomaterial':
						return handleVideoTextureMaterial(child);
					case 'dynamictexturematerial':
						return getDynamicTextureMaterial(child);
				}
			}
			return new THREE.MeshPhongMaterial();
		}
		function getAttributes(ele) {
			// var att = {};
			// if (ele && ele.attributes) {
			// 	for (var n = 0; n < ele.attributes.length; n++) {
			// 		var name = ele.attributes[n].nodeName;
			// 		var val = ele.attributes[n].nodeValue;
			// 		att[name.toLowerCase()] = val;
			// 	}
			// }
			return self.getAttributes(ele);
		}


		function setCommonAttributes(obj, att) {
			self.setCommonAttributes(obj, att);
		}
		function handleMeshBasicMaterial(ele) {
			var mat;
			var att = getAttributes(ele);

			if (att.id) {
				mat = findMaterial(att.id);
				if (!mat) {
					mat = new THREE.MeshBasicMaterial();
					mat.name = att.id;
					materials.push(mat);
				}
			}
			else {
				mat = new THREE.MeshBasicMaterial();
			}
			if (att.video) {
				var video = document.getElementById('video');
				if (!video) {
					video = document.createElement('video');
					video.id = 'video';
					video.style.display = 'none';
					video.autoplay = 'yes';
					video.playsinline = 'yes';
					container.appendChild(video);
				}
				const texture = new THREE.VideoTexture(video);

				const geometry = new THREE.PlaneGeometry(16, 9);
				geometry.scale(0.5, 0.5, 0.5);
				//const material = new THREE.MeshBasicMaterial({ map: texture });
				mat.map = texture;

				var facing = att.facing ? att.facing : 'user';
				var width = toN(att.width, 1280);
				var height = toN(att.height, 720);

				if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

					const constraints = { video: { width: width, height: height, facingMode: facing } };

					navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {

						// apply the stream to the video element used in the texture

						video.srcObject = stream;
						video.play();

					}).catch(function (error) {

						console.error('Unable to access the camera/webcam.', error);

					});

				} else {

					console.error('MediaDevices interface not available.');

				}

			}
			return mat;
		}
		function handleVideoTextureMaterial(ele) {
			var att = getAttributes(ele);

			// assuming you have created a HTML video element with id="video"
			const video = document.createElement('video');
			video.id = 'video';
			video.style.display = 'none';
			//video.style.width = '10px';
			video.loop = 'yes';
			video.autoplay = 'yes';
			video.playsinline = 'yes';
			video.crossOrigin = 'anonymous';
			const source = document.createElement('source');
			source.src = att.url;
			source.type = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
			video.appendChild(source);
			document.children[0].appendChild(video);
			

			const texture = new THREE.VideoTexture(video);
			const parameters = { color: 0xffffff, map: texture };
			return new THREE.MeshLambertMaterial(parameters);

		}
		function handleMeshPhongMaterial(ele) {
			var mat;
			var att = getAttributes(ele);

			if (att.id) {
				mat = findMaterial(att.id);
				if (!mat) {
					mat = new THREE.MeshPhongMaterial();
					mat.name = att.id;
					materials.push(mat);
				}
			}
			else {
				mat = new THREE.MeshPhongMaterial();
			}

			if (att.color) {
				var c = toColor(att.color);
				mat.color = c;
			}
			mat.flatShading = false;
			if (att.emissive) {
				var e = toColor(att.color, new THREE.Color(1, 1, 1));
				mat.emissive = e;
				if (att.emissiveintensity) {
					mat.emissiveIntensity = toN(att.emissiveintensity);
				}
			}
			if (att.url) {
				try {
					const loader = new THREE.TextureLoader();
					let map = loader.load(att.url);
					if (att.map) {
						var v = toV2(att.map);
						map.wrapS = THREE.RepeatWrapping;
						map.wrapT = THREE.RepeatWrapping;
						map.repeat.set(v.x, v.y);
					}
					mat.map = map
				}
				catch (x) { console.log(x); }
			}
			if (att.normalmap) {
				try {
					const loader2 = new THREE.TextureLoader();
					mat.normalMap = loader2.load(att.normalmap);
				}
				catch (x) { console.log(x); }
			}
			if (att.fog && !toB(att.fog)) {
				mat.fog = false;
			}
			if (att.shininess) {
				mat.shininess = toN(att.shininess);
			}
			if (att.specular) {
				mat.specular = toColor(att.specular);
			}
			if (att.envmap && toB(att.envmap)) {
				if (!cubeCamera) {
					cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
						format: THREE.RGBFormat,
						generateMipmaps: true,
						minFilter: THREE.LinearMipmapLinearFilter,
						encoding: THREE.sRGBEncoding
					});
					cubeCamera = new THREE.CubeCamera(1, 10000, cubeRenderTarget);
					scene.add(cubeCamera);
				}
				mat.envMap = cubeRenderTarget.texture;
				//mat.color.offsetHSL(0.1, - 0.1, 0);
			}
			mat.blending = THREE.NoBlending;
			if (att.side) {
				switch (att.side.toLowerCase()) {
					case 'frontside':
						mat.side = THREE.FrontSide;
						break;
					case 'backside':
						mat.side = THREE.BackSide;
						break;
					case 'doubleside':
						mat.side = THREE.DoubleSide;
						break;
				}
			}

			mat.alphaTest = toN(att.alphatest, 0);
			mat.opacity = toN(att.opacity, 1);

			return mat;
		}
		var cubeRenderTarget;
		var cubeCamera;
		function findMaterial(name) {
			for (var n = 0; n < materials.length; n++) {
				if (materials[n].name == name) {
					return materials[n];
				}
			}
		}


		///////////////////////////////////////////////////////////////////////

		//End common tags
		//Shape





		//End shape

		///////////////////////
		function createTreeCss() {
			var style = document.getElementById('treecss');
			if (!style) {
				style = document.createElement('style');
				style.id = 'treecss'
				style.type = 'text/css';
				style.innerText = `
.maintree{
        position: absolute;
        top: 30px;
    }

.refresh{
        width:30px;
        height:30px;
        display:inline-block;
        background: url('/threeml/images/refresh.svg') no-repeat left;
        background-size: 30px 30px;
        cursor: pointer;
        vertical-align:top;
    }
.save{
        width:30px;
        height:30px;
        display:inline-block;
        background: url('/threeml/images/download.svg') no-repeat left;
        background-size: 30px 30px;
        cursor: pointer;
        vertical-align:top;
}
.refresh:hover{
        background-color: silver;
    }
.objtree{
            display:inline-block;
    }
.node {
        margin-left: 0px;
    }
.ntitle {
    padding-left: 24px;
    cursor: pointer;
    background: url('/threeml/images/closed.svg') no-repeat left ;
	background-color: white;
    background-size: 30px 30px;
    background-position-x: -5px;
	color:black;
}
.ntitle.open {
    background: url('/threeml/images/open.svg') no-repeat left;
    background-size: 30px 30px;
    background-position-x: -5px;
	background-color: white;
}
.ntitle.none {
    background: none;
	background-color: white;
}
.ntitle:hover{
        background-color: silver;
    }
.children {
        margin-left: 10px;
    }
.hide {
        display: none;
    }`;

				document.head.appendChild(style);
			}
		}
		var threediv;
		var maintree;
		function parseScene(scene) {
			createTreeCss();
			maintree = divWithClass('maintree');
			var refresh = divWithClass('refresh');
			refresh.setAttribute('title', 'Reload objects from scene')
			refresh.addEventListener('click', function () {
				refreshTree(threeml.getScene());
			});
			maintree.appendChild(refresh);
			/////////////
			var save = divWithClass('save');
			save.setAttribute('title', 'Upload this ThreeMl page.')
			save.addEventListener('click', function () {
				createTreePage();
			});
			maintree.appendChild(save);
			//////////////
			threediv = divWithClass('objtree');
			threediv.appendChild(check(scene));
			maintree.appendChild(threediv);
			document.body.appendChild(maintree);
		}
		function refreshTree(scene) {
			if (threediv) {
				while (threediv.childNodes.length > 0) {
					threediv.removeChild(threediv.childNodes[0]);
				}
				threediv.appendChild(check(scene));
			}
			else {
				parseScene(scene);
			}
		}
		function divWithClass(className) {
			var div = document.createElement('div');
			div.className = className;
			return div;
		}
		function check(obj) {

			var name = obj.name ? obj.name + ' (' + obj.type + ')' : obj.type;
			var node_div = divWithClass('node');
			var title_div = divWithClass('ntitle');
			title_div.innerText = name;
			title_div.setAttribute('data', obj.id);
			title_div.addEventListener('click', function (event) {
				var n = this.getAttribute('data');
				showGui(n, this.innerText);
				var p = this.parentNode;
				for (var i = 0; i < p.children.length; i++) {
					var c = p.children[i];
					if (c.classList.contains('children')) {
						if (c.classList.contains('hide')) {
							c.classList.remove('hide');
							this.classList.add('open');
						}
						else {
							c.classList.add('hide');
							this.classList.remove('open');
						}
					}

				}
			});
			node_div.appendChild(title_div);
			if (obj.children && obj.children.length > 0) {
				var childrendiv = divWithClass('children hide');

				for (var i = 0; i < obj.children.length; i++) {
					childrendiv.appendChild(check(obj.children[i]));
				}
				node_div.appendChild(childrendiv);
			}
			else {
				title_div.classList.add('none');
			}
			return node_div;
		}
		const lf = '\r\n';
		const tb = '   ';
		function createTreePage() {
			var h = '';
			h += '<html>' + lf;
			h += tb + '<head>' + lf;
			h += tb + tb + '<style>' + lf;
			//h += tb + tb + tb + '#container {' + lf;
			//h += tb + tb + tb + tb + 'pointer-events: none;' + lf;
			//h += tb + tb + tb + '}' + lf;
			h += tb + tb + '</style>' + lf;
			h += tb + '</head>' + lf;
			h += tb + '<body>' + lf;
			h += tb + tb + '<div id="container">' + lf;
			h += tb + tb + tb + '<three>' + lf;
			h += checkChildren(scene, 3);
			h += tb + tb + tb + '</three>' + lf;
			h += tb + tb + '</div>' + lf;

			h += tb + '<script>' + lf;
			h += tb + tb + 'var threeml;' + lf;
			h += tb + '</script>' + lf;
			h += tb + '<script type="module">' + lf;
			h += tb + tb + '//Remember to have the threeml folder copied here!' + lf;
			h += tb + tb + 'import { ThreeML } from \'./threeml/threeml.js\'' + lf;
			h += tb + tb + 'threeml = new ThreeML();' + lf;
			h += tb + tb + 'threeml.parseThree();' + lf;
			h += tb + '</script>' + lf;
			h += tb + '</body>' + lf;
			h += '</html>';
			h = h.replaceAll(lf + lf, lf);

			downloadBlob(h, "threemlexample.html", "text/html");
		}


		function downloadBlob(content, fileName, contentType) {
			if (Blob !== undefined) {

				var blob = new Blob(["\ufeff", content], { type: contentType });
				if (navigator.msSaveBlob) {
					return navigator.msSaveBlob(blob, fileName);
				}
				clickAref(URL.createObjectURL(blob), fileName);
			} else {
				clickAref(encodeURIComponent(content), fileName);
			}
		}
		function clickAref(href, download, useBlankTaget) {
			var link = document.createElement("a");
			link.setAttribute("href", href);
			if (download) {
				link.setAttribute("download", download);
			}
			if (useBlankTaget) {
				link.setAttribute("target", "_blank");
			}
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

		}


		function tryGetIframe(obj) {
			var css3d = obj.children[0];
			var maindiv = css3d.element;
			if (maindiv && maindiv.childNodes && maindiv.childNodes.length > 1) {
				var iframe = maindiv.childNodes[1];
				return iframe;
			}

		}
		function checkChildren(obj, level, isThreeMParent = false) {
			var h = '';
			level++;
			var tabs = '';
			for (var i = 0; i < level; i++) {
				tabs += tb;
			}
			var tagName = obj.type;
			if (isThreeMParent && (tagName == 'Mesh' || tagName == 'Object3D')) {
				tagName = undefined;
			}
			if (tagName && tagName.length > 0 && tagName != 'Scene') {
				if (tagName == 'Mesh' && obj.geometry && obj.geometry.type) {
					tagName = obj.geometry.type;
				}
				var url;
				var zoom;
				if (obj.url) {
					url = obj.url;
				}
				if (obj.threemlType) {
					tagName = obj.threemlType;
					isThreeMParent = true;
					if (tagName == "HtmlPlaneGeometry") {
						var ifr = tryGetIframe(obj);
						if (ifr) {
							url = ifr.src;
							if (ifr.style.zoom != "1") {
								zoom = Number(ifr.style.zoom);
							}
						}
					}

				}

				h += tabs + '<' + tagName;
				if (obj.name) {
					h += ' name="' + obj.name + '"';
				}
				if (url) {
					h += ' url="' + url + '"';
				}
				if (zoom) {
					h += ' zoom="' + round(zoom) + '"';
				}
				if (!obj.visible) {
					h += ' visible="false"';
				}
				if (obj.position && obj.position.length() > 0) {
					h += ' position=' + Vector3ToString(obj.position);
				}
				if (obj.rotation && (obj.rotation.x != 0 || obj.rotation.y != 0 || obj.rotation.z != 0)) {
					h += ' rotation=' + Vector3ToString(obj.rotation, 180);
				}
				if (obj.scale && (obj.scale.x != 1 || obj.scale.y != 1 || obj.scale.z != 1)) {
					h += ' scale=' + Vector3ToString(obj.scale);
				}

				if (obj.intensity && obj.intensity != 1) {
					h += ' intensity="' + round(obj.intensity) + '"';
				}
				if (obj.target && obj.target.name) {
					h += ' target="' + obj.target.name + '"';
				}
				if (obj.castShadow) {
					h += ' castShadow="true"';
				}
				if (obj.receiveShadow) {
					h += ' receiveShadow="true"';
				}
				if (obj.color && (obj.color.r != 1 || obj.color.g != 1 || obj.color.b != 1)) {
					h += ' color=' + ColorToString(obj.color);
				}

				h += '>';
				if (obj.material) {
					var mat = obj.material
					var matName = mat.type;
					h += lf + tabs + tb + '<' + matName;
					if (mat.color) {
						h += ' color=' + ColorToString(mat.color);
					}
					if (mat.emissive && (mat.emissive.r != 0 || mat.emissive.g != 0 || mat.emissive.b != 0)) {
						h += ' emissive=' + ColorToString(mat.emissive);
					}
					if (mat.map && mat.map.image && mat.map.image.src && mat.map.image.src.length > 0) {
						h += ' url="' + mat.map.image.src + '"';
					}
					h += '></' + matName + '>' + lf;
				}
				if (obj.presentProp) {
					var pp = obj.presentProp
					var tagtName = 'present';
					h += lf + tabs + tb + '<' + tagtName;
					if (pp.speed) {
						h += ' speed="' + pp.speed + '"';
					}
					if (pp.cameradistance) {
						h += ' cameradistance="' + pp.cameradistance + '"';
					}
					h += '></' + tagtName + '>' + lf;
				}
				if (obj.draggable) {
					h += tabs + tb + '<draggable></draggable>' + lf;
				}
			}
			if (obj.children) {
				if (obj.children.length > 0) {
					h += lf;
				}
				else {
					tabs = '';
				}
				for (var i = 0; i < obj.children.length; i++) {
					h += checkChildren(obj.children[i], level, isThreeMParent);
				}
			}
			if (tagName && tagName.length > 0 && tagName != 'Scene') {
				h += tabs + '</' + tagName + '>' + lf;
			}
			return h;
		}
		function ColorToString(c) {
			var v = new THREE.Vector3(c.r, c.g, c.b);
			return Vector3ToString(v);
		}
		function Vector3ToString(v, fact = 1) {
			if (v.x == v.y && v.y == v.z) {
				return '"' + round(v.x * fact) + '"';
			}
			return '"' + round(v.x * fact) + ' ' + round(v.y * fact) + ' ' + round(v.z * fact) + '"';
		}
		function round(n) {
			if (Number(n.toFixed(2)) == n) {
				return n;
			}
			return n.toFixed(2);
		}
	}
	const FixHandle = {
		NONE: 'none',
		TOGGLE: 'toggle'
	}
	const SoftBodyConstraint = {
		FIXED: 'fixed',
		WIND: 'wind',
		GRAVITY: 'gravity',
		STRETCH: 'stretch',
		NORMAL: 'normal',
		FLOOR: 'floor',
		STRUCTURE: 'structure',
		DRAG: 'drag',
		GRAB: 'grab'
	}
	const GrabMode = {
		NONE: 'none',
		INIT: 'init',
		DRAG: 'drag'


	}
	const CameraMode = {
		FIXED: 'fixed',
		LOOKAT: 'lookat',
		SCAN: 'scan',
		CLICK: 'click',
		DRAG: 'drag',
		FLY: 'fly',
		ORBIT: 'orbit'
	}
	const Images = {
		MagnifyImage: "data:image/png;base64,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",
		ArrowLeft: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAR+SURBVGhD7ZddbBRVFMfvvTuzO92lW6CkoDVGE6kxfkSbmBgC5aWEBxPbpE00NbR9oSH0wQZ8AR7aYLTxA61JI1pCYxAwMUCKiYlGIQJtFSmJVYLSahU/aLd0293udr5nrufO3Nl+UbdvOw/zSzvn3HPPnTv/e/be2UUBAQEBAQEBAQEB+cDcroq+X81NX/5052gqq5TFRdzes6viG95VcAi3ebn0Dy2+8Vfyi/HpbK1moS2TGfVc5/mRUt5dcFYlZGCChq+NJs8O/X63klKKbNNAiqIU/zmefISnFJy8Qi7foXhodKZ38FZih0URskDEXCaNsDyTLJOsmzyt4OQVMjyWeqv/l/GXDRsqYZlIV2VEszNKzJqrea15a4anFZz/FdI9kGobvDXxqmrayLYtpGsKsrMpqyxiNZztqBvgab5gRSHd/ekXr45MHMmqJoiwkaEqyMqm0MaI0frpoZo+nuYb7ink+NVs3fWxxOkZWSc2BRGaigwQcb9kHD59sOYjnuYrlgnpGZytGhwZP3k3oxIEJ5ShayAijTaF9ePNVQ938DTfsUhIz3ezTwyNTZ5PpGWJHbOeiJiVPVX/bPme6i1PwrnlT3Jv9g8H0uXDt6e+/3s68wCFsKnrSJdnURikxkvLEjgkmISEECaedhjKRjNp/C5wsC1h+RcH6gzgcJfFYN3gf8kNoO3k58IUSQJZTzCOqIZ5Ix4JNfU2VvzIenIzNfXePJWc0xuYCPauQLA3wlIRImLYTcJuKuaWDXVdL+4YgLedK5BzFrmLmH/OhUJcAW7Ec1zBrqWIUHrhTMtj1SySu3fNu4PXDUGqZCECq05CsPpOD1wdh7cW+J5hDnPdSV1yXZyFfS48AsZ7OJf5h3WurMHbC0UwGyH08rnWyu0smpuv/u2Lr6QM0iVE1yAoHXy0NLcyi1j6eAAPYXfeBcwHmOekuU/C4X4u5Dlg4c9ZMDffZgFvZtdCG6M/4kVSw2f7qn6Yj3NqOr9ul6nYIcbiKCJJyDJ0ZKpzKIa0n2HPvMdyxBBB0QhUC2M7mdUTTHSIQBUxVNGxGJVEBSSAn5KNKd20DRGqy2YSYCxjXVREMbgH9M39O6PMhoUQ5BMkCsTJKZFEtHljEUu1m3Y+PuUMysMiIYyXjlw8kNTw62KsBDMxsBzOxl8n0vaTe5457Gb5j2VCGI3vf7t/QkbvhKJuZbxTrDRC3zjR8vQhnuYr7imE0dh1qSWh0KMkGidMDPtQGiBmrWB3bt4QPdhR/yjP9AfL3uweJ9q295SvIc22nDY0RXE2nhgOo5RJDoxOyW/yNN+wYkU8Wj64Un87bX6Ci+KSVAQbEDY1q8z6sN1V99SGfbXPwfvTB6xYEY+evdvOPFgi1BI1o6pQGQovSlaZaR239Q0nnudpBSevEMaxvdu+Ki8WdoS0TEaT4YcVfK1nB4CsahU8peCsSgjjWOvW/ofWhquxmpmU4aculVNKMTE+590FJ+8eWcru7iv3ZRTtBYlYFz7ev/M3Hg4ICAgICAgICAjwOwj9B9ip7KxI4EoZAAAAAElFTkSuQmCC",
		ArrowRight: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARjSURBVGhD7ZddaBxVFMfPzM7Obj62iSY0paHUQhGRVkWpSGyqtAn4ICTYomBUQh+kH4JR60NbkETRopCCUkE3VEjU6EMiTcWHgC8tSbQY6wdq6QaDSDQf7WY/Mzuzd+Zez525M8lgk/ggZB7m9zDn3nPO3Dn/nblnZiEkJCQkJCQkJCRkPSRhA8HzH6da8oT11FZXLDx2z9aj7XcpcyK0LrKwG86ZkVTdQkH/wrCgaXax2P7Ln+mvLs2whAivS2CE/DGb3lkqlRLUJMAYg8nfb9z/3VR6eHyOqSJlTQIjZHPc+k3SMumlQg4sFGMxgInr862TU5mPLv/N1t0CgRHyRufeQpW11MaKmVJZ14BaJhDKYOzabMdP09l3RNqqBEYIZ7j74PjmmPU0LWatslECSi3QTYp3Zu7EufFsl0i7JYESwvnsdNuFhhg5bhWzQHQuhkJRN+FKaq733FjuKZH2LwInhDN4qu3DrXHyOuFiDB0oo5DRyvL30/OD568UD4o0H4EUwunct6N7i1o+T4o5IGUDsJXBjYIuT6RmP0lO5PeJNI/ACmlp2s0O7Wk8UmUVP3XF8LY8n9Pik9MLI8lv8rtEqo3X1g4PpO7LG1Z/PKrsoowZuMkWvTAayT74u6CEc+6yY7bDMRzP5wN76gpkN4W7+dgOOzkM9wbf7MwylXx6oaFMAdTKTaCoKqYy2HZ7Yube7fUPHXm45i+e713tUPLa11SSDvDi7DLsCB6Edafi4CCErfD48JUtJss+UbDnYGLs+kUALR9RUoYybn6QZIgoUbwmg7oqdbD/8N0dPM2r4Yn3r14yqITPHhfB3X4xjs+Ze34bMXenywMb/8wt04HHRNn2cTnoiuLgwB4LQZZldzI+j5r61ZGXmx7gUe86T569/GC+pA/iAju4213HsXaazCu2L2BP3VOF9VbyBjh01lnhQfwz753tXtCH38nvhKLGsIsxMLUi1EZp19Cr+9/lMf+qa9A/+ms9GnlqvgQ5nYBpUSD4sjLx1ymbFjTeVrFJVeSqJfzqy2jEPofn8FoI/ooYi9ZWRutNfFvnNNMuhuKYt1bLtvioVKsN+EjJGq5B+LkI7omXliC2W4lXQSSqgqHrQJbyUCmR7pGTrT12EvKfhWwEz3zww2sZIvXwDc7bqyMix+pi7PTnr+w/42Q5BFbIc8kf30wb0im3S3ERlpaHLZVwYuDFR3tFmkfghHQPXYepm9pbWVM+GUURfFNyEVTL04YK6ehA1yNJkeojcC9EFPG2T0QJv7e0HGmsljtXE8EJzB258O2MNPzzzbOLZbnLEUFBRxGslNe31yjPJo81D4nUWxIRdsOJ7+l4PE0i70WxvTIUwe+ErBf0bTVKe9+x5i9F2qoE5tHSdONOxrc1tnND0yBiFAqNCaUVRYyKlDUJjJCETC4yLVvS8K+upBcW7qhVW/qO7x0T4XUJVNfq7B3dqdPIgURF7GLfC82zwh0SEhISEhISEhLyfwDwD8Z+Cxj9p9dsAAAAAElFTkSuQmCC",
		Home: "data:image/png;base64,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",
	}
	const LoaderCss = "	\
#cover { \
		width: 100vw; \
		height: 100vh; \
		dispay: block; \
		position: absolute; \
		top: 0; \
		left: 0; \
		padding-top:50vh; \
		padding-left:50vw; \
		z-index: 2; \
		background-color: white; \
	} \
#loader { \
		border: 5px solid #f3f3f3; /* Light grey */ \
		border-top: 5px solid #3d3d3d; /* Grey */ \
		border-radius: 50%; \
		width: 40px; \
		height: 40px; \
		animation: spin 1s linear infinite; \
		position: absolute; \
		top: 50 %; \
		left: 50 %; \
		zindex: 3; \
	} \
 \
@keyframes spin { \
	0% { transform: rotate(0deg); } \
	100% { transform: rotate(360deg); } \
} \
";
}
export { ThreeML };
