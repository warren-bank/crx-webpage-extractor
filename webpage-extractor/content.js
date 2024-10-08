// -----------------------------------------------------------------------------
// state:

let active_mode_enabled = false

const css_classname = 'webpage-extractor'
const use_capture   = true
const actions       = ['Copy Link URLs', 'Copy Image URLs', 'Copy Text Content', 'Remove Element']
const action_values = actions.map(action => action.toLowerCase().replace(/ +/g, '-'))

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

const cancel_event = (event) => {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

const is_dialog_visible         = () => (state.clicked.length > 0)
const is_dialog_selected        = () => (typeof state.selected === 'number')
const is_dialog_actions_visible = () => is_dialog_selected()

const get_css_classname                        = (what) => `${css_classname}${what ? `-${what}` : ''}`
const get_css_classname_root                   = ()     => get_css_classname()
const get_css_classname_dialog                 = ()     => get_css_classname('dialog')
const get_css_classname_dialog_close           = ()     => get_css_classname('dialog-close')
const get_css_classname_dialog_selected        = ()     => get_css_classname('dialog-selected')
const get_css_classname_dialog_actions         = ()     => get_css_classname('dialog-actions')
const get_css_classname_dialog_actions_visible = ()     => 'actions-visible'

const get_dialog          = () => document.querySelector(`body.${get_css_classname_dialog()} > div#${get_css_classname_dialog()}`)
const get_dialog_selected = () => is_dialog_selected() ? state.clicked[state.selected] : null
const get_dialog_actions  = () => get_dialog().querySelector(`:scope > div#${get_css_classname_dialog_actions()}`)

const is_target_dialog         = (event) => event.target.hasAttribute('x-index')
const is_target_dialog_close   = (event) => event.target.getAttribute('id') === get_css_classname_dialog_close()
const is_target_dialog_actions = (event) => event.target.hasAttribute('x-action')

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
    if (!is_target_dialog(event) && !is_target_dialog_close(event) && !is_target_dialog_actions(event)) {
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

  for (let i=0; i < actions.length; i++) {
    const action_title = actions[i]
    const action_value = action_values[i]

    const action_button = document.createElement('button')
    action_button.setAttribute('x-action', action_value)
    action_button.appendChild(
      document.createTextNode(action_title)
    )

    dialog_actions.appendChild(action_button)
  }

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

    const action_value = event.target.getAttribute('x-action')
    const action_index = action_values.indexOf(action_value)

    if (action_index >= 0) {
      const $el = get_dialog_selected()

      switch(action_index) {
        case 0:  // 'Copy Link URLs'
          {
            let urls
            urls = [...$el.querySelectorAll('a')].map($a => $a.href).filter(url => !!url).sort()
            urls = dedupe_sorted_array(urls)
            urls = urls.join("\n")
            navigator.clipboard.writeText(urls)
          }
          break
        case 1:  // 'Copy Image URLs'
          {
            let urls
            urls = [...$el.querySelectorAll('img')].map($img => $img.src).filter(url => !!url).sort()
            urls = dedupe_sorted_array(urls)
            urls = urls.join("\n")
            navigator.clipboard.writeText(urls)
          }
          break
        case 2:  // 'Copy Text Content'
          {
            const text = $el.textContent
            navigator.clipboard.writeText(text)
          }
          break
        case 3:  // 'Remove Element'
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
  // add highlight to selected item in list
  get_dialog().querySelector(`li[x-index="${state.selected}"]`).classList.add(get_css_classname_dialog_selected())

  // add highlight to selected item in DOM
  get_dialog_selected().classList.add(get_css_classname_dialog_selected())

  // show actions
  get_dialog().classList.add(get_css_classname_dialog_actions_visible())
}

const hide_dialog_actions = () => {
  // check that selected item was not removed
  if (state.selected < state.clicked.length) {
    // remove highlight from selected item in list
    get_dialog().querySelector(`li[x-index="${state.selected}"]`).classList.remove(get_css_classname_dialog_selected())

    // remove highlight from selected item in DOM
    get_dialog_selected().classList.remove(get_css_classname_dialog_selected())
  }

  // hide actions
  get_dialog().classList.remove(get_css_classname_dialog_actions_visible())

  // update state
  state.selected = null
}
