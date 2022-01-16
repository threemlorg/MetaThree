using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using ThreeMLBase;
namespace js3test.sub.docu
{
    public partial class threemlparts : ThreeMLBase.ThreeMLPage
    {
        protected void Page_Load(object sender, EventArgs e)
        {


            var tags = (from tag in DataContext.Tags
                       //where comp.CompanyName.StartsWith("Ad")
                            orderby tag.Name
                            select new ThreeMLBase.TagExt { ID= tag.ID,Name= tag.Name,Description= tag.Description, Example= tag.Example }).ToList();


            TagsRepeater.DataSource = tags;

            TagsRepeater.DataBind();

        }

        protected void TagsRepeater_ItemDataBound(object sender, RepeaterItemEventArgs e)
        {
            string tagId = (e.Item.FindControl("TagId") as HiddenField).Value;
            Repeater attributesRepeater = e.Item.FindControl("AttributesRepeater") as Repeater;
            int tagnr = int.Parse(tagId);

            var attributes = (from t in DataContext.TagAttributes
                              where t.itsTag.ID == tagnr
                              select new { t.itsAttribute.ID, t.itsAttribute.Name, t.itsAttribute.Description }).ToList();


            attributesRepeater.DataSource = attributes;
            attributesRepeater.DataBind();
        }
    }
}