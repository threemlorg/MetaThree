/*********************************************** 
  needPopup 
  - Version 1.0.0
  - Copyright 2015 Dzmitry Vasileuski
	- Licensed under MIT (http://opensource.org/licenses/MIT)
***********************************************/

// popup object
var needPopup = (function() {

	// namespace
	var popup = {};
	// cached nodes
	popup.html = document.documentElement,
  popup.body = document.body,
  popup.window = window,
  // state variables
	popup.target = 0, 
	// window scroll top
  popup.scrollTopVal = 0,
  // window scroll height
  popup.scrollHeight = popup.body.scrollHeight > popup.html.scrollHeight ? popup.body.scrollHeight : popup.html.scrollHeight,
  // html class when popup is opened
  popup.openHtmlClass = popup.scrollHeight > popup.window.innerHeight ? 'needpopup-opened needpopup-scrolled' : 'needpopup-opened';

	// global methods and properties
	return {

		/* Initialization of popup
		***********************************************/
		init : function() {

			// set default config
			popup.options = needPopup.config.default;

			// bind popup show to data-popupshow nodes
			$(popup.body).on('click','[data-needpopup-show]', function(event) {
				event.preventDefault();
				needPopup.show($(this).data('needpopupShow'),$(this));
			})

			// bind popup hide to removers
			$(popup.body).on('click','.needpopup_wrapper .remove, .needpopup_remover', function(event) {
				event.preventDefault();
				needPopup.hide();
			})

			// bind popup hide if clicked outside
			$(popup.body).on('click','.needpopup_wrapper', function(event) {
				if (!$(event.target).is('.needpopup_wrapper')) return;

				if (!popup.options.closeOnOutside) return;

				// check if clicked outside of popup window
				if ($(event.target).closest('.needpopup').length || $(event.target).is('.needpopup, .remove, .needpopup_remover')) return;

				needPopup.hide();
			})

			// hide popup on Esc
			$(document).keydown(function(event){
				if (event.which == 27) {
					needPopup.hide();
				}
			})

			// corrections on window resize
			popup.resizeTimeout = 0;
			popup.resizeAllowed = true;
			$(popup.window).on('resize',function() {
				// throttling
				clearTimeout(popup.resizeTimeout);
				if (popup.resizeAllowed) {
          popup.resizeAllowed = false;

					// centrify popup
					needPopup.centrify();
					// recalculate window scroll height
					popup.scrollHeight = popup.body.scrollHeight > popup.html.scrollHeight ? popup.body.scrollHeight : popup.html.scrollHeight,
					// change open htmml class if needed
			 		popup.openHtmlClass = popup.scrollHeight > popup.window.innerHeight ? 'needpopup-opened needpopup-scrolled' : 'needpopup-opened';
			 	}
        popup.resizeTimeout = setTimeout(function() {
          popup.resizeAllowed = true;
        }, 100);
			})

			// create popup wrapper
			popup.wrapper = document.createElement('div');
			popup.wrapper.className = 'needpopup_wrapper';
			popup.body.appendChild(popup.wrapper);
			popup.wrapper = $(popup.wrapper);
		},

		/* Show popup
		***********************************************/
		show : function(_target, _trigger) {

			// save popup trigger if it exists
			if (!_trigger)
				popup.trigger = 0;
			else
				popup.trigger = _trigger;

			// hide already opened popup
			if (popup.target)
				needPopup.hide(true);
			else {
				// recalculate window scroll top
				popup.scrollTopVal = popup.window.pageYOffset;

				// block page scroll
				$(popup.body).css({'top': -popup.scrollTopVal});
				$(popup.html).addClass(popup.openHtmlClass);
			}
			
			// set target popup
			popup.target = $(_target);

			// reset options if defined
			popup.options = {};
			$.extend( popup.options, needPopup.config['default'] );
			if (!!popup.target.data('needpopupOptions'))
				$.extend( popup.options, needPopup.config[popup.target.data('needpopupOptions')] );


			// cache popup width
			popup.minWidth = popup.target.outerWidth();

			// create layout
			popup.wrapper.append(popup.target);
			if (popup.options.removerPlace == 'outside')
				popup.wrapper.after('<a href="#" class="needpopup_remover"></a>');
			else if (popup.options.removerPlace == 'inside')
				popup.target.append('<a href="#" class="needpopup_remover"></a>'); 

			// on before show callback
			popup.options.onBeforeShow.call(popup,popup.target);
			
			// display popup
			popup.target.show();
			// centrify popup
			needPopup.centrify();
			// add opened class to popup (timeout for transitions)
			setTimeout(function(){
				popup.target.addClass('opened');

				// on show callback
				popup.options.onShow.call(popup,popup.target);
			},10);
		},

		/* Hide popup
		***********************************************/
		hide : function(_partial) {

			// hide popup
			popup.target.hide().removeClass('opened');
			// delete remover
			$('.needpopup_remover').remove();

			// full hiding
			if (!_partial) {

				// unblock page scroll
				$(popup.html).removeClass(popup.openHtmlClass).removeClass('needpopup-overflow');
				$(popup.body).css({'top': 0}).scrollTop(popup.scrollTopVal);
				$(popup.html).scrollTop(popup.scrollTopVal);
			}

			// on hide callback
			popup.options.onHide.call(popup,popup.target);

			// unset property
			popup.target = 0;
		},

		/* Centrify popup and set responsive classes
		***********************************************/
		centrify: function() {
			if (popup.target) {
				// vertical centrification
				if (popup.target.outerHeight() > popup.window.innerHeight)
					popup.target.addClass('stacked');
				else
					popup.target.removeClass('stacked').css({'margin-top':-popup.target.outerHeight()/2, 'top':'50%'});

				// detect width overflow
				popup.minWidth = $(popup.html).hasClass('needpopup-overflow') ? popup.minWidth : popup.target.outerWidth();
				if (popup.minWidth + 30 >= popup.window.innerWidth) {
					$(popup.html).addClass('needpopup-overflow');
				} else {
					$(popup.html).removeClass('needpopup-overflow');
				}
			}
		},

		/* Configuration object which contains all options sets
		***********************************************/
		'config': {
			'default' : {
				// 'outside' to place in wrapper and 'inside' to place in popup
				'removerPlace': 'inside',
				// close on click outside popup
				'closeOnOutside': true,
				// on show callback
				onShow: function() {},
				// on before show callback
				onBeforeShow: function() {},
				// on hide callback
				onHide: function() {}
			}
		}

	}

})();
