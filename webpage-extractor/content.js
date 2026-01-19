// -----------------------------------------------------------------------------
// state:

let active_mode_enabled = false

const css_classname = 'webpage-extractor'
const use_capture   = true

const state = {}

// -----------------------------------------------------------------------------
// helpers:

const reset_state = () => {
  state.clicked  = []
  state.selected = null
}

const remove_dom_elements = (nodes) => {
  if (!Array.isArray(nodes))
    nodes = [nodes]

  for (let node of nodes) {
    if (node instanceof HTMLElement) {
      node.parentNode.removeChild(node)
    }
  }
}

const dedupe_sorted_array = (old_array) => {
  const new_array = []
  let prev_value
  for (let value of old_array) {
    if (value === prev_value) continue
    prev_value = value
    new_array.push(value)
  }
  return new_array
}

const filter_protocol_from_uris_array = (old_array, protocol) => old_array.filter(url => (url.length < protocol.length) || (url.substring(0, protocol.length).toLowerCase() !== protocol))

const filter_data_protocol_from_uris_array = (old_array) => filter_protocol_from_uris_array(old_array, 'data:')

const cancel_event = (event) => {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

const is_dialog_visible         = () => (state.clicked.length > 0)
const is_dialog_selected        = () => (typeof state.selected === 'number')
const is_dialog_actions_visible = () => is_dialog_selected()

const get_css_classname                          = (what) => `${css_classname}${what ? `-${what}` : ''}`
const get_css_classname_root                     = ()     => get_css_classname()
const get_css_classname_dialog                   = ()     => get_css_classname('dialog')
const get_css_classname_dialog_close             = ()     => get_css_classname('dialog-close')
const get_css_classname_dialog_selected          = ()     => get_css_classname('dialog-selected')
const get_css_classname_dialog_actions           = ()     => get_css_classname('dialog-actions')
const get_css_classname_dialog_actions_visible   = ()     => 'actions-visible'
const get_css_classname_dialog_actions_copy_urls = ()     => ({
  'container':                 'copy-urls',
  'select_page_element':       'copy-urls-page-element',
  'checkbox_sort_and_dedupe':  'copy-urls-sort-and-dedupe',
  'checkbox_remove_data_uris': 'copy-urls-remove-data-uris'
})

const get_dialog                   = () => document.querySelector(`body.${get_css_classname_dialog()} > div#${get_css_classname_dialog()}`)
const get_dialog_selected          = () => is_dialog_selected() ? state.clicked[state.selected] : null
const get_dialog_actions           = () => get_dialog().querySelector(`:scope > div#${get_css_classname_dialog_actions()}`)
const get_dialog_actions_copy_urls = () => {
  const classnames = get_css_classname_dialog_actions_copy_urls()
  const elements = {}
  delete classnames.container
  for (let key of Object.keys(classnames)) {
    elements[key] = document.getElementById(classnames[key])
  }
  return elements
}

const is_target_dialog            = (event) => event.target.hasAttribute('x-index')
const is_target_dialog_close      = (event) => event.target.getAttribute('id') === get_css_classname_dialog_close()
const is_target_dialog_actions    = (event) => event.target.hasAttribute('x-action')
const is_target_dialog_descendant = (event) => get_dialog().contains(event.target)

// -----------------------------------------------------------------------------
// bootstrap:

const process_runtime_message = (message) => {
  if (message === 'toggle_webpage_extractor_active_mode')
    toggle_active_mode()
}

chrome.runtime.onMessage.addListener(process_runtime_message)

const toggle_active_mode = () => {
  reset_state()

  if (active_mode_enabled)
    disable_active_mode()
  else
    enable_active_mode()
}

const enable_active_mode = () => {
  document.addEventListener('click', handle_click_event, use_capture)
  document.addEventListener('keydown', handle_keydown_event, use_capture)
  document.body.classList.add(get_css_classname_root())
  active_mode_enabled = true
}

const disable_active_mode = () => {
  if (is_dialog_visible())
    hide_dialog()

  document.removeEventListener('click', handle_click_event, use_capture)
  document.removeEventListener('keydown', handle_keydown_event, use_capture)
  document.body.classList.remove(get_css_classname_root())
  active_mode_enabled = false
}

// -----------------------------------------------------------------------------
// click handler:

const handle_click_event = (event) => {
  if (is_dialog_visible()) {
    if (!is_target_dialog(event) && !is_target_dialog_descendant(event)) {
      cancel_event(event)
    }
    return
  }
  cancel_event(event)

  state.clicked = [...document.body.querySelectorAll(`:scope *:hover`)]

  if (state.clicked.length) {
    document.body.classList.remove(get_css_classname_root())
    show_dialog()
  }
}

// -----------------------------------------------------------------------------
// keydown handler:

const handle_keydown_event = (event) => {
  if (event.key === 'Escape') {
    cancel_event(event)

    if (is_dialog_actions_visible()) {
      hide_dialog_actions()
    }
    else if (is_dialog_visible()) {
      hide_dialog()
      document.body.classList.add(get_css_classname_root())
    }
    else {
      disable_active_mode()
    }
  }
}

// -----------------------------------------------------------------------------
// dialog UI:

const show_dialog = () => {
  document.body.classList.add(get_css_classname_dialog())
  let classnames

  const dialog = document.createElement('div')
  dialog.setAttribute('id', get_css_classname_dialog())

  const dialog_close = document.createElement('div')
  dialog_close.setAttribute('id', get_css_classname_dialog_close())
  dialog_close.appendChild(
    document.createTextNode('X')
  )
  dialog_close.addEventListener('click', handle_dialog_close_click_event, use_capture)

  const dialog_actions = document.createElement('div')
  dialog_actions.setAttribute('id', get_css_classname_dialog_actions())
  classnames = get_css_classname_dialog_actions_copy_urls()
  dialog_actions.innerHTML = `
    <div class="${classnames.container}">
      <div>
        <label for="${classnames.select_page_element}">Page Element:</label>
        <select id="${classnames.select_page_element}">
          <option value="links" selected="selected">Links</option>
          <option value="images">Images</option>
          <option value="iframes">IFrames</option>
          <option value="media-tracks">Media Tracks</option>
          <option value="any">Any</option>
        </select>
      </div>
      <div>
        <input id="${classnames.checkbox_sort_and_dedupe}" type="checkbox" checked="checked" /><label for="${classnames.checkbox_sort_and_dedupe}"> Sort and Remove Duplicates</label>
      </div>
      <div>
        <input id="${classnames.checkbox_remove_data_uris}" type="checkbox" checked="checked" /><label for="${classnames.checkbox_remove_data_uris}"> Remove data: URIs</label>
      </div>
      <button x-action="copy-urls">Copy URLs</button>
    </div>
    <button x-action="copy-text-content">Copy Text Content</button>
    <button x-action="remove-element">Remove Element</button>
`
  dialog_actions.addEventListener('click', handle_dialog_actions_click_event, use_capture)

  const list = document.createElement('ul')

  for (let index=0; index < state.clicked.length; index++) {
    const $el =  state.clicked[index]
    let label = $el.tagName

    if ($el.id)
      label += `#${$el.id}`

    for (let i=0; i < $el.classList.length; i++)
      label += `.${$el.classList[i].toString()}`

    const listitem = document.createElement('li')
    listitem.setAttribute('x-index', String(index))
    listitem.appendChild(
      document.createTextNode(label)
    )

    list.appendChild(listitem)
  }

  list.addEventListener('mouseenter', handle_dialog_mouseenter_event, use_capture)
  list.addEventListener('mouseleave', handle_dialog_mouseleave_event, use_capture)
  list.addEventListener('click',      handle_dialog_click_event,      use_capture)

  dialog.appendChild(dialog_close)
  dialog.appendChild(dialog_actions)
  dialog.appendChild(list)
  document.body.appendChild(dialog)
}

const handle_dialog_close_click_event = (event) => {
  cancel_event(event)

  hide_dialog()
  document.body.classList.add(get_css_classname_root())
}

const handle_dialog_actions_click_event = (event) => {
  if (is_target_dialog_actions(event)) {
    cancel_event(event)

    const action    = event.target.getAttribute('x-action')
    const $selected = get_dialog_selected()

    switch(action) {
      case 'copy-urls':
        {
          const elements                     = get_dialog_actions_copy_urls()
          elements.select_page_element       = elements.select_page_element.value
          elements.checkbox_sort_and_dedupe  = elements.checkbox_sort_and_dedupe.checked
          elements.checkbox_remove_data_uris = elements.checkbox_remove_data_uris.checked

          let urls
          switch(elements.select_page_element) {
            case 'links':
              // a[href], map > area[href]
              urls = [...$selected.querySelectorAll('a[href], map > area[href]')].map($el => $el.href || $el.getAttribute('href'))
              break
            case 'images':
              // img[src], picture > source[srcset], embed[type^="image/"][src]
              urls = [...$selected.querySelectorAll('img[src], picture > source[srcset], embed[type^="image/"][src]')].map($el => $el.src || $el.getAttribute('src') || $el.getAttribute('srcset'))
              break
            case 'iframes':
              // iframe[src], embed[type="text/html"][src]
              urls = [...$selected.querySelectorAll('iframe[src], embed[type="text/html"][src]')].map($el => $el.src || $el.getAttribute('src'))
              break
            case 'media-tracks':
              // audio[src], audio > source[src], audio > track[src], video[src], video > source[src], video > track[src], embed[type^="audio/"][src], embed[type^="video/"][src]
              urls = [...$selected.querySelectorAll('audio[src], audio > source[src], audio > track[src], video[src], video > source[src], video > track[src], embed[type^="audio/"][src], embed[type^="video/"][src]')].map($el => $el.src || $el.getAttribute('src'))
              break
            case 'any':
              // *[*^="http"]
              urls = get_urls_from_any_element_in_selected_container($selected)
              break
          }

          if (!Array.isArray(urls))
            urls = []

          if (urls.length)
            urls = urls.filter(url => !!url)

          if (urls.length && elements.checkbox_sort_and_dedupe)
            urls = dedupe_sorted_array(urls.sort())

          if (urls.length && elements.checkbox_remove_data_uris)
            urls = filter_data_protocol_from_uris_array(urls)

          urls = (urls.length)
            ? urls.join("\n")
            : 'No matching URLs.'

          navigator.clipboard.writeText(urls)
        }
        break

      case 'copy-text-content':
        {
          const text = $selected.textContent
          navigator.clipboard.writeText(text)
        }
        break

      case 'remove-element':
        {
          // remove selected element and all nested child elements

          const nodes = []
          let $el

          // include list items in dialog
          $el = get_dialog().querySelector(`li[x-index="${state.selected}"]`)
          nodes.push($el)
          while($el = $el.nextElementSibling) {
            if (is_target_dialog({target: $el}))
              nodes.push($el)
            else
              break
          }

          // include dom elements
          for (let i=state.selected; i < state.clicked.length; i++) {
            nodes.push(state.clicked[i])
          }

          remove_dom_elements(nodes)

          // update state
          state.clicked = state.clicked.slice(0, state.selected)
        }
        break
    }

    hide_dialog_actions()
  }
}

const get_urls_from_any_element_in_selected_container = ($selected) => {
  const urls = []
  const allElements = $selected.getElementsByTagName('*')

  for (const element of allElements) {
    for (const attr of element.attributes) {
      if (attr.value.toLowerCase().startsWith('http')) {
        urls.push(attr.value)
      }
    }
  }

  return urls
}

const handle_dialog_mouseenter_event = (event) => {
  const $el = get_listitem_from_event(event)

  if ($el)
    $el.classList.add(get_css_classname_dialog_selected())
}

const handle_dialog_mouseleave_event = (event) => {
  const $el = get_listitem_from_event(event)

  if ($el)
    $el.classList.remove(get_css_classname_dialog_selected())
}

const handle_dialog_click_event = (event) => {
  const index = get_listitem_id_from_event(event)

  if (typeof index === 'number') {
    state.selected = index

    show_dialog_actions()
  }
  else if (is_dialog_actions_visible() && !is_target_dialog_actions(event)) {
    hide_dialog_actions()
  }
}

const get_listitem_from_event = (event) => {
  const index = get_listitem_id_from_event(event)

  return (typeof index === 'number')
    ? state.clicked[index]
    : null
}

const get_listitem_id_from_event = (event) => {
  if (is_target_dialog(event)) {
    cancel_event(event)

    if (!is_dialog_actions_visible()) {
      const index = parseInt(event.target.getAttribute('x-index'), 10)
      return index
    }
  }
  return null
}

const hide_dialog = () => {
  const dialog = get_dialog()
  if (dialog) document.body.removeChild(dialog)

  document.body.classList.remove(get_css_classname_dialog())

  reset_state()
}

// -----------------------------------------------------------------------------
// dialog actions UI:

const show_dialog_actions = () => {
  const dialog          = get_dialog()
  const dialog_selected = get_dialog_selected()
  const dialog_actions  = get_dialog_actions()

  // add highlight to selected item in list
  dialog.querySelector(`li[x-index="${state.selected}"]`).classList.add(get_css_classname_dialog_selected())

  // add highlight to selected item in DOM
  dialog_selected.classList.add(get_css_classname_dialog_selected())

  // show actions
  dialog.classList.add(get_css_classname_dialog_actions_visible())

  // set position
  dialog_actions.style.top = (dialog.scrollTop + dialog.clientHeight - dialog_actions.clientHeight) + 'px'
}

const hide_dialog_actions = () => {
  const dialog          = get_dialog()
  const dialog_selected = get_dialog_selected()
  const dialog_actions  = get_dialog_actions()

  // check that selected item was not removed
  if (state.selected < state.clicked.length) {
    // remove highlight from selected item in list
    dialog.querySelector(`li[x-index="${state.selected}"]`).classList.remove(get_css_classname_dialog_selected())

    // remove highlight from selected item in DOM
    dialog_selected.classList.remove(get_css_classname_dialog_selected())
  }

  // hide actions
  dialog.classList.remove(get_css_classname_dialog_actions_visible())

  // reset position
  dialog_actions.style.top = '0px'

  // update state
  state.selected = null
}
