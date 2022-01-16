<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="snippet.aspx.cs" Inherits="js3test.sub.docu.snippet" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Snippets</title>
    <link href="../css/bootstrap.min.css" rel="stylesheet" type="text/css" />
    <link type="text/css" href="../css/main.css" rel="stylesheet"  />
    <script type="text/javascript"  src="../js/jquery.js"  ></script>
    <style>
        .table{
            display:table;
            width:100%;
        }
        .headerrow,
        .tablerow
        {
            display:table-row;
        }
        .headercell,
        .tablecell
        {
            border:solid 1pt;
            display:table-cell;
            padding:6px;
            background-color:aliceblue;
            cursor:pointer;
       }
        .headercell.description{
            width:500px;
        }
        .tablerow.selected .tablecell{
            background-color:gainsboro;

        }
        .headercell
        {
            background-color:azure;
        }
        .code{
            color:indianred;
            font-family:monospace;
        }
        .source{
            display:none;
        }
        .exampleimg{
            width:200px;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="navbar navbar-inverse navbar-fixed-top">
            <div class="container">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#myNav">
                        <span class="icon-bar"></span><span class="icon-bar"></span><span class="icon-bar">
                        </span>
                    </button>
                    <a href="#" class="navbar-brand">
                        <img src="../images/logo.png" />
                    </a>
                </div>
                <div id="myNav" class="collapse navbar-collapse">
                    <ul class="nav navbar-nav navbar-right">
                        <li><a href="/main.aspx" target="_top">Home</a></li>
<%--                        <li ><a href="javascript:loadFromGroup('x');">Hello world</a></li>
                        <li class="active"><a href="javascript:loadFromGroup('y');">Basics</a></li>--%>
                        <li><a href="../search/index.aspx" target="_top">Search websites</a></li>
                       <li class="active"><a>Code snippets</a></li>


                        <li><a href="mailto:admin@v-slam.org">Contact</a></li>
                    </ul>
                </div>
            </div>
                    <div class="table" style="margin-bottom:0px">
                <div class="headerrow">
                    <div class="headercell" style="width:5vw"></div>
                    <div class="headercell description" style="width:35vw"><asp:TextBox ID="searchbox" runat="server" TextMode="Search" AutoPostBack="true" ToolTip="search"></asp:TextBox> 
                        <asp:ImageButton ID="searchbutton" CssClass="searchimage"   runat="server" ImageUrl="~/sub/search/images/hololens_icon.png" Width="80px" ToolTip="Search" />

                    </div>
                    <div class="headercell">Code (click rows to see them in action)</div>
                </div>
            </div>
        </div>
        <div>


             <div class="table" style="margin-top:140px">
                <asp:Repeater ID="TagsRepeater" runat="server" >
                     <ItemTemplate>
                        <div class="tablerow">
                            <div class="tablecell" style="vertical-align:middle;width:5vw" ><img class="exampleimg" src="<%# Eval("ImageUrl") %>" /></div>
                            <div class="tablecell" style="width:35vw"><%# Eval("EncodedDescription") %></div>
                            <div class="tablecell code"><%# Eval("EncodedExample") %></div>
                            <div class="source"><%# Eval("Example") %></div>
                        </div>
                     </ItemTemplate>
                </asp:Repeater>
            </div>
        </div>

        <script type="text/javascript">
            var threeml;
            $('.tablerow').click(function () {
                var c = $(this).find('.source').html();
                threeml.loadCodeInGroup('mygroup', '<three><orbitcontrols enabled="false"></orbitcontrols><camera position="0 0 0" rotation="0 0 0"></camera><cursor3d clear="true"></cursor3d><skybox></skybox><renderer clearColor="1 1 1"><media suspend="true"></media><datgui clear="true"></datgui><fog density="0"></fog>' + c + '</three>');
                $('.tablerow').removeClass('selected');
                $(this).addClass('selected');
                threeml.present('main', false);
            })
        </script>
            <script type="module">

                threeml = window.top.threeml


            </script>
 
    </form>
</body>
</html>
