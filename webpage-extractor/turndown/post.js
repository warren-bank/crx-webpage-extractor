window.turndownPluginGfm = window.exports
delete window.exports

window.getTurndownService = function() {
  var gfm = window.turndownPluginGfm.gfm
  var turndownService = new TurndownService()
  turndownService.use(gfm)
  return turndownService
}

window.getMarkdown = function(input) {
  return window.getTurndownService().turndown(input)
}
