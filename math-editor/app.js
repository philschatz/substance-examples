import {
  Component, ProseEditor, ProseEditorConfigurator, EditorSession,
  ProseEditorPackage, BlockNode, Tool, InsertNodeCommand
} from 'substance'

import MathBlock from './MathBlock'
import MathJaxRenderComponent from './MathJaxRenderComponent'
import MathQuillComponent from './MathQuillComponent'
import AceComponent from './AceComponent'

class AdvancedMathEditWithPreview extends Component {
  constructor(...args) {
    super(...args)
    this.handleActions({
      'aceUpdated': this._aceUpdated,
    })
  }

  getInitialState() {
    return {source: this.props.source}
  }

  render($$) {
    const {language} = this.props
    const source = this.state.source || this.props.source

    const el = $$('div')
    .append('Enter Latex Source:')
    .append(
      // TODO: Use the ACE editor
      // $$('input')
      // .attr('value', source)
      // .on('blur', this._updateSource)
      // .on('keyup', this._updateSource)
      // .ref('sourceLatex')
      $$(AceComponent, {source, language}).ref('hack-to-not-rerender1')
    )
    .append($$(MathJaxRenderComponent, {source, language}).ref('hack-to-not-rerender2'))

    return el
  }

  // _updateSource() {
  //   const source = this.refs['sourceLatex'].getNativeElement().value
  //   if (source !== this.state.source) {
  //     this.extendState({source})
  //     this.send('mathAdvancedUpdated', source)
  //   }
  // }

  _aceUpdated(source) {
    if (source !== this.state.source) {
      this.extendState({source})
      this.send('mathAdvancedUpdated', source)
    }
  }


}

class MathEditModal extends Component {
  constructor(...args) {
    super(...args)

    this.handleActions({
      'mathQuillUpdated': this._sourceUpdated,
      'mathAdvancedUpdated': this._sourceUpdated,
    })
  }

  render($$) {
    let {source, language} = this.props
    let Button = this.getComponent('button')
    let el = $$('div')
    el.append($$('div'))
    .append($$('h2').append('Edit the math below (uses MathQuill):'))
    .append($$(MathQuillComponent, {source}))
    .append($$('hr'))
    .append($$('h2').append('Or, edit the latex directly'))
    .append($$(AdvancedMathEditWithPreview, {language, source}))

    el.append(
      $$('div').addClass('se-actions').append(
        $$(Button).addClass('se-save').append('Save').on('click', this._save),
        $$(Button).addClass('se-cancel').append('Cancel').on('click', this._cancel)
      )
    )
    return el
  }

  _sourceUpdated(source) {
    this.__source__ = source
  }
  _save() {
    this.send('saveMath', this.__source__)
  }

  _cancel() {
    this.send('cancelMath')
  }
}

/*
  Display component
*/
class MathEditComponent extends Component {
  constructor(...args) {
    super(...args)

    this.handleActions({
      'saveMath': this._saveAndCloseModal,
      'cancelMath': this._closeModal,
    })

    this.props.node.on('properties:changed', this.rerender, this)
  }

  render($$) {
    let Modal = this.getComponent('modal')
    let node = this.props.node
    let {language, source} = node

    let el = $$('div').addClass('sc-math-editor')
    el.append(
      $$(MathJaxRenderComponent, {language, source}).ref('hack-to-not-rerender3')
      .on('click', this._toggleEditor)
    )

    if (this.state.editMath) {
      el.append(
        $$(Modal, {
          width: 'medium'
        }).append(
          // $$(EditorClass, contrib)
          $$(MathEditModal, {language, source})
        )
      )
    }

    return el;
  }

  dispose() {
    this.context.editorSession.off(this)
  }

  _saveAndCloseModal(source) {
    let nodeId = this.props.node.id
    if (source !== this.props.node.source) {
      this.context.surface.transaction(function(tx) {
        tx.set([nodeId, 'source'], source)
      }, { source: this, skipSelection: true })
    }
    this._closeModal()
  }

  _closeModal() {
    this.setState({
      editMath: false
    })
  }

  _toggleEditor() {
    this.setState({
      editMath: true
    })
  }

  _updateModelOnBlur() {
    let editor = this.editor
    let nodeId = this.props.node.id
    let source = editor.getValue()
    if (source !== this.props.node.source) {
      this.context.surface.transaction(function(tx) {
        tx.set([nodeId, 'source'], editor.getValue())
      }, { source: this, skipSelection: true })
    }
  }

  _onModelChange(change, info) {
    if (info.source !== this) {
      this.editor.setValue(this.props.node.source, -1)
    }
  }
}

MathEditComponent.fullWidth = true;

/*
  Command for math insertion
*/
class InsertMathCommand extends InsertNodeCommand {
  createNodeData() {
    return {
      type: 'math',
      language: 'text/tex',
      content: ''
    }
  }
}

/*
  Package defintion for math extension
*/
let MathPackage = {
  name: 'math',
  configure: function(config) {
    config.addNode(MathBlock)
    config.addComponent(MathBlock.type, MathEditComponent)
    config.addCommand('insert-math', InsertMathCommand)
    config.addTool('insert-math', Tool, {toolGroup: 'insert'})
    config.addIcon('insert-math', { 'fontawesome': 'fa-code' })
    config.addLabel('insert-math', 'Math Formula')
  }
}

/*
  Example document
*/
let fixture = function(tx) {
  let body = tx.get('body')
  tx.create({
    id: 'h1',
    type: 'heading',
    level: 1,
    content: 'MathEditor Test Page'
  })
  body.show('h1')
  tx.create({
    id: 'intro',
    type: 'paragraph',
    content: [
      'These things should work: editing a formula using MathQuill (need to click twice to open the editor), editing using the "Full-Source", deleting a formula by pressing the Delete key, Undoing a delete by pressing Ctrl+Z, copying/cutting just the selected math element (and then pasting), copying/cutting multiple lines of text with math and pasting.',
      // 'It is possible to use 3rd party components, a math editor for instance (which uses MathJax for rendering, MathQuill for WYSIWYG editing, and ACE for advanced text editing).',
      // 'The editor us wrapped into a separate component which makes it independent from the main word-processor interface.',
      // 'Here is some inline math that you should eventually be able to select and "upgrade" to real math: x=\\frac{-b\\pm \\sqrt{b^2-4ac}}{2a}',
    ].join(" ")
  })
  body.show('intro')
  tx.create({
    id: 's1',
    type: 'math',
    language: 'text/tex',
    source: "x=\\frac{-b\\pm \\sqrt{b^2-4ac}}{2a}",
  });
  body.show('s1')
  tx.create({
    id: 'p2',
    type: 'paragraph',
    content: [
      "And here is another formula (which does not work in MathQuill)"
    ].join(" ")
  })
  body.show('p2')

  tx.create({
    id: 's2',
    type: 'math',
    language: 'text/tex',
    source:
`\\mathbf{A} =
\\begin{bmatrix}
a_{11} & a_{12} & \\cdots & a_{1n} \\\\
a_{21} & a_{22} & \\cdots & a_{2n} \\\\
\\vdots & \\vdots & \\ddots & \\vdots \\\\
a_{m1} & a_{m2} & \\cdots & a_{mn}
\\end{bmatrix} =
\\left( \\begin{array}{rrrr}
a_{11} & a_{12} & \\cdots & a_{1n} \\\\
a_{21} & a_{22} & \\cdots & a_{2n} \\\\
\\vdots & \\vdots & \\ddots & \\vdots \\\\
a_{m1} & a_{m2} & \\cdots & a_{mn}
\\end{array} \\right) =\\left(a_{ij}\\right) \\in \\mathbb{R}^{m \\times n}.
`,
  });
  body.show('s2')

  tx.create({
    id: 'the-end',
    type: 'paragraph',
    content: [
      "TODO: Support delete key when selected, Make modal pretty, Support MathML, Add/edit/upgrade-by-selecting inline math, Formula cheat-sheet. That's it!"
    ].join(" ")
  })
  body.show('the-end')
}

/*
  Application
*/
let cfg = new ProseEditorConfigurator()
cfg.import(ProseEditorPackage)
cfg.import(MathPackage)

window.onload = function() {
  let doc = cfg.createArticle(fixture)
  let editorSession = new EditorSession(doc, {
    configurator: cfg
  })
  ProseEditor.mount({
    editorSession: editorSession
  }, document.body)
}