### [Webpage Extractor](https://github.com/warren-bank/crx-webpage-extractor)

WebExtension to extract information from selected visible elements from the current webpage.

#### Usage:

* click the menu icon to toggle the extension on/off
* when on:
  - all _:hover_ DOM elements are highlighted by a red border
  - when clicked:
    * all _:hover_ DOM elements are listed in a modal dialog
    * when any representation of a DOM element in this list is hovered:
      - the DOM element is highlighted by a red border
    * when any representation of a DOM element in this list is clicked:
      - a context menu is displayed
      - the buttons in this context menu represent various actions that can be performed on the selected DOM element:
        * Copy URLs
          - [select] Page Element:
            * Links
            * Images
            * IFrames
            * Media Tracks
          - [checkbox] Sort and Remove Duplicates
          - [checkbox] Remove _data:_ URIs
        * Copy Text Content
        * Remove Element
    * the modal dialog can be closed in any of the following ways:
      - the "X" icon in the top-right corner of the dialog
      - the "Esc" key

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
