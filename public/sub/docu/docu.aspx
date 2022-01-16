<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="docu.aspx.cs" Inherits="js3test.sub.docu.docu" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>ThreeML documentation</title>
    	<style>
		body {
			overflow: hidden;
		}

		#container {
			pointer-events: none;
			background-color: white;
		}
	</style>
</head>
<body>
    <form id="form1" runat="server">
 		<div id="container">

            <three>
                <group name="screens" position="-0.6 0 -2" rotation="0 45 0">
                    <htmlPlaneGeometry url="snippet.aspx" name="main" zoom="1" position='0 0.06 0' scale='1.2' rotation="0 0 0">
                        <present cameradistance="1.2" class="handle" speed="0.03" atStart="true"></present>
                    </htmlPlaneGeometry>
                </group>

                <group name="mygroup" position="0.6 0 -1"></group>
            </three>

		</div>
		<script>
			var threeml;
		</script>
		<script type="module">
            import { ThreeML } from '../../threeml/threeml.js?<%=Guid.NewGuid().ToString()%>';
            threeml = new ThreeML();
			threeml.parseThree();
        </script>
    </form>
</body>
</html>
