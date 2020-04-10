// Compiled using marko@4.19.8 - DO NOT EDIT
"use strict";

var marko_template = module.exports = require("marko/src/html").t(__filename),
    marko_componentType = "/ipse$0.0.0/template/room/index.marko",
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

  out.w("<header><link type=\"text/css\" rel=\"stylesheet\" href=\"css/style.css\"><link href=\"https://fonts.googleapis.com/css2?family=Nunito:wght@300&amp;display=swap\" rel=\"stylesheet\"><style>\r\nbody {\r\n\tfont-family: 'Nunito', sans-serif;\r\n\tcolor:white;\r\n\tbackground-image: url(\"../sfondo.jpg\");\r\n}\r\n</style></header><body align=\"center\">");

  component_globals_tag({}, out);

  out.w("<h1 style=\"margin-top: 5%\">Players:</h1><br>");

  var $for$0 = 0;

  marko_forOf(data.players, function(player) {
    var $keyScope$0 = "[" + (($for$0++) + "]");

    out.w("<div style=\"font-size:24px\">" +
      marko_escapeXml(player.nickname) +
      "</div>");
  });

  out.w("<br><br><button onClick=\"window.location.reload(true);\">Refresh</button><br>");

  const url= "/match?id=" + data.player.id

  out.w("<a" +
    marko_attr("href", "" + url) +
    "><button style=\"font-size: 24px; margin: 10px\">Play</button></a>");

  init_components_tag({}, out);

  await_reorderer_tag({}, out, __component, "14");

  out.w("</body>");
}

marko_template._ = marko_renderer(render, {
    ___implicit: true,
    ___type: marko_componentType
  });

marko_template.meta = {
    id: "/ipse$0.0.0/template/room/index.marko",
    tags: [
      "marko/src/core-tags/components/component-globals-tag",
      "marko/src/core-tags/components/init-components-tag",
      "marko/src/core-tags/core/await/reorderer-renderer"
    ]
  };
