// Compiled using marko@4.19.8 - DO NOT EDIT
"use strict";

var marko_template = module.exports = require("marko/src/html").t(__filename),
    marko_component = {
        onCreate: function() {
          this.state = {
              count: 1
            };
        }
      },
    marko_componentType = "/ipse$0.0.0/template/narrator/index.marko",
    marko_renderer = require("marko/src/runtime/components/renderer"),
    marko_loadTag = require("marko/src/runtime/helpers/load-tag"),
    component_globals_tag = marko_loadTag(require("marko/src/core-tags/components/component-globals-tag")),
    marko_forOf = require("marko/src/runtime/helpers/for-of"),
    helpers_escape_xml = require("marko/src/runtime/html/helpers/escape-xml"),
    marko_escapeXml = helpers_escape_xml.x,
    marko_attr = require("marko/src/runtime/html/helpers/attr"),
    init_components_tag = marko_loadTag(require("marko/src/core-tags/components/init-components-tag")),
    await_reorderer_tag = marko_loadTag(require("marko/src/core-tags/core/await/reorderer-renderer"));

function render(input, out, __component, component, state) {
  var data = input;

  out.w("<header><link type=\"text/css\" rel=\"stylesheet\" href=\"css/style.css\"><link href=\"https://fonts.googleapis.com/css2?family=Nunito:wght@300&amp;display=swap\" rel=\"stylesheet\"><style>\r\n* {\r\n\tbox-sizing: border-box;\r\n}\r\nbody {\r\n\tfont-family: 'Nunito', sans-serif;\r\n\tcolor:white;\r\n\tbackground-image: url(\"../sfondo.jpg\");\r\n}\r\n.row {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  justify-content: center;\r\n  padding-top:1%\r\n}\r\n.columnleft{\r\n\tflex: 20%;\r\n  padding: 10px;\r\n}\r\n.columncenter{\r\n\tflex: 50%;\r\n}\r\n.columnright{\r\n  flex: 30%;\r\n  margin: auto;\r\n}\r\n.column{\r\n\tflex:50%\r\n}\r\nimg{\r\n\theight: 250px;\r\n\tborder-radius: 10px;\r\n\tmargin: 5px;\r\n}\r\n.line-break {\r\n  width: 100%;\r\n}\r\n</style></header><body align=\"center\">");

  component_globals_tag({}, out);

  out.w("<div class=\"row\"><div class=\"columnleft\"><h1>ipse</h1>");

  var $for$0 = 0;

  marko_forOf(data.players, function(player) {
    var $keyScope$0 = "[" + (($for$0++) + "]");

    out.w("<div style=\"font-size:24px\">" +
      marko_escapeXml(player.points) +
      " " +
      marko_escapeXml(player.nickname) +
      "</div>");
  });

  out.w("</div><div class=\"columncenter\"><div align=\"center\" class=\"row\" style=\"padding-top:0\">");

  var $for$1 = 0;

  marko_forOf(data.player.cards, function(card) {
    var $keyScope$1 = "[" + (($for$1++) + "]");

    out.w("<div>" +
      marko_escapeXml(state.count) +
      "<br><img" +
      marko_attr("src", card) +
      "></div>");

    if (state.count == 3) {
      out.w("<div class=\"line-break\"></div>");
    }

    state.count++
  });

  out.w("</div></div><div class=\"columnright\"><form entype=\"text/plain\" method=\"POST\" action=\"/match\" align=\"center\"><label>choose a card</label><br><input type=\"text\" name=\"card\" placeholder=\"n\" maxlength=\"1\" size=\"1\"><br><br><label>inspiration</label><br><input type=\"textarea\" name=\"inspiration\" placeholder=\"inspiration\" maxlength=\"50\" size=\"50\"><input type=\"hidden\" name=\"id\"" +
    marko_attr("value", "" + data.player.id) +
    "><br><br><input type=\"submit\" value=\"confirm\"></form></div></div>");

  init_components_tag({}, out);

  await_reorderer_tag({}, out, __component, "29");

  out.w("</body>");
}

marko_template._ = marko_renderer(render, {
    ___type: marko_componentType
  }, marko_component);

marko_template.meta = {
    id: "/ipse$0.0.0/template/narrator/index.marko",
    component: "./",
    tags: [
      "marko/src/core-tags/components/component-globals-tag",
      "marko/src/core-tags/components/init-components-tag",
      "marko/src/core-tags/core/await/reorderer-renderer"
    ]
  };
