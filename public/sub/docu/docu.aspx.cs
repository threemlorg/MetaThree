using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace js3test.sub.docu
{
    public partial class docu : ThreeMLBase.ThreeMLPage
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            CheckClick("/sub/docu/docu.aspx");
        }
    }
}