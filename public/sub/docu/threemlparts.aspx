<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="threemlparts.aspx.cs" Inherits="js3test.sub.docu.threemlparts" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title></title>
    <link type="text/css" href="../css/main.css" rel="stylesheet"  />
    <script type="text/javascript"  src="../js/jquery.js"  ></script>
</head>
<body>
    <form id="form1" runat="server">
        <div>
            <asp:Repeater ID="TagsRepeater" runat="server" OnItemDataBound="TagsRepeater_ItemDataBound">
                 <ItemTemplate>
                     <div class="code-item">
                        <div class="code-tag"><%# Eval("Name") %></div>
                        <div class="btns">
                            <div class="tagbtns desbtn" title="description"></div>
                            <div class="tagbtns attbtn" title="description"></div>
                            <div class="tagbtns codebtn" title="description"></div>
                        </div>
                        <div class="code-desc hidden"><%# Eval("Description") %></div>
                        <div class="code-code hidden"><%# Eval("EncodedExample") %></div>

                         <div class="code-attr hidden">
                             <asp:Repeater ID="AttributesRepeater" runat="server" >
                                  <ItemTemplate>
                                     <div class="item ">
                                                  <div class="code-attr"><%# Eval("Name") %></div>
                                                  <div class="code-desc"><%# Eval("Description") %></div>
                                    </div>
                                  </ItemTemplate>
                             </asp:Repeater>
                         </div>
                     <asp:HiddenField ID="TagId" runat="server" Value='<%# Eval("ID") %>' />
                    </div>
                     </ItemTemplate>
            </asp:Repeater>
        </div>
    </form>
    <script type="text/javascript">
        function findChild(obj, c) {
            return $(obj).closest('.code-item').find(c);
        }
        $('.desbtn').click(function () {
            var obj = findChild(this, '.code-desc');
            if (obj.hasClass('hidden')) {
                obj.removeClass('hidden');
            }
            else {
                obj.addClass('hidden');
            }
        })
        $('.codebtn').click(function () {
            var obj = findChild(this, '.code-code');
            if (obj.hasClass('hidden')) {
                obj.removeClass('hidden');
            }
            else {
                obj.addClass('hidden');
            }
        })
        $('.attbtn').click(function () {
            var obj = findChild(this, '.code-attr');
            if (obj.hasClass('hidden')) {
                obj.removeClass('hidden');
            }
            else {
                obj.addClass('hidden');
            }
        })
    </script>
</body>
</html>
