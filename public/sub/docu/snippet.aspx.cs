using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace js3test.sub.docu
{
    public partial class snippet : ThreeMLBase.ThreeMLPage
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            var s = searchbox.Text;

            var tags = (from snippet in DataContext.Snippets
                        orderby snippet.ID
                        where snippet.Example.Contains(s) || snippet.Description.Contains(s)
                        select new ThreeMLBase.TagExt { ID = snippet.ID,  Description = snippet.Description, Example = snippet.Example, ImageUrl=snippet.ImageUrl }).ToList();


            TagsRepeater.DataSource = tags;

            TagsRepeater.DataBind();
        }
    }
}