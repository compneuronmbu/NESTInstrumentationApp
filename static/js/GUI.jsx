try  // try to import React and ReactDOM for testing
{
  var React = require('react');
  var ReactDOM = require('react-dom');
}
catch(err)
{}

class GuiButtons extends React.Component{
    constructor() {
      super();
      this.state = {
        neuronModels: [''],
        synapseModels: ['',''],
        modalSelection: false,
        hidden: true,
        saving: false,
        mod: true,
        loadContents: {},
        modalMessage: '',
        modalHead: ''
      }
    }

    componentWillMount() {
      app.synapseNeuronModelCallback = (data) => {
        // `this` refers to our react component
        this.setState({neuronModels: data[0], synapseModels: data[1]});
      };
      app.setGuiState = (state) => {
        // `this` refers to our react component
        this.setState(state);
      };
    }

    render() {
        return (
          <div id="reactroot">

            <div id="gui-box">
              <div id="gui-box-title">
                Neuron type
              </div>
              <DropDown items={this.state.neuronModels.map(function(model){return ({value: model, text: model});})}
                        id='neuronType' />
            </div>

            <div id="gui-box">
              <div id="gui-box-title">
                Synapse model
              </div>
              <DropDown items={this.state.synapseModels.map(function(model){return ({value: model[1], text: model[1]});})}
                        id='synapseModel' />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Mask shape
                </div>
                <SelectionsButton button_class ='selectionsButton'
                button_id='rectangleButton' text="&#x25FC;" function={function () {app.makeRectangularShape();}} />
                <SelectionsButton button_class ='selectionsButton'
                button_id='ellipticalButton' text="&#x2b2c;" 
                    //disabled={app.is3DLayer+1}
                    function={function () {app.makeEllipticalShape();}} />
                <br/>
                {app.is3DLayer ? (
                  <SelectionsButton text='Make mask box'
                      disabled={!app.is3DLayer || !this.state.mod}
                      function={function () {app.makeMaskBox();}}
                      button_class ='button'
                      button_id='maskBoxButton' />
                  ) : (null)}
                {app.isLFP ? (
                  <SelectionsButton text='Make LFP box'
                      disabled={!app.isLFP || !this.state.mod}
                      function={function () {app.makeMaskBox(true);}}
                      button_class ='button lfp'
                      button_id='LfpBoxButton' />
                  ) : (null)}
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Stimulation device
                </div>
                <SelectionsButton text='poissonGenerator'
                    disabled={!this.state.mod}
                    function={function () {app.makeStimulationDevice("poisson_generator");}}
                    button_class ='button pill big'
                    button_id='poissonButton' />
                <br/>
                <SelectionsButton text=' ac Generator'
                    disabled={!this.state.mod}
                    function={function () {app.makeStimulationDevice("ac_generator");}}
                    button_class ='button pill big'
                    button_id='acButton' />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Recording device
                </div>
                <SelectionsButton text='voltmeter'
                    disabled={!this.state.mod}
                    function={function () {app.makeRecordingDevice("voltmeter");}}
                    button_class ='button pill big'
                    button_id='voltmeterButton' />
                <br/>
                <SelectionsButton text='spikeDetector'
                    disabled={!this.state.mod}
                    function={function () {app.makeRecordingDevice("spike_detector");}}
                    button_class ='button pill big'
                    button_id='spikeDetectorButton' />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                </div>
                <div className="button-group">
                    <SelectionsButton text='Connect'
                                      disabled={!this.state.mod}
                                      function={app.makeConnections.bind(app)} button_class ='button wide'
                                      button_id='getSelectionsButton'/>
                    <SelectionsButton text='Simulate'
                                      disabled={!this.state.mod}
                                      function={app.runSimulation.bind(app)} button_class ='button wide'
                                      button_id='runSimulationButton'/>
                </div>
                <hr/>
                <div className="button-group">
                    
                    <SelectionsButton text={this.state.saving ? 'Saving...' : 'Save'}
                                      disabled={this.state.projectionModal || this.state.saving || !this.state.mod}
                                      function={app.saveSelection.bind(app)} button_class ='button wide'
                                      button_id='saveSelectionButton'/>
                    <input id="uploadAnchorElem" type="file" style={{display: "none"}}/>
                    <SelectionsButton text='Load'
                                      disabled={this.state.projectionModal || this.state.saving || !this.state.mod}
                                      function={app.loadSelection.bind(app)} button_class ='button wide'
                                      button_id='loadSelectionButton'/>
                </div>
                <hr/>
                <div className="button-group">
                    <SelectionsButton text='Stream'
                                      function={app.streamSimulate.bind(app)} button_class ='button animated'
                                      button_id='streamButton'/>
                    <SelectionsButton text='Abort'
                                      function={app.abortSimulation.bind(app)} button_class ='button danger animated'
                                      button_id='abortButton'/>
                </div>
            </div>
            {this.state.modalMessage ? (
              <ModalDialog id='modalMessage'
                           head={this.state.modalHead}
                           selection={false}
                           messageText={this.state.modalMessage}/>
              ) : (null)}
            {this.state.modalSelection ? (
              <ModalDialog id='modalSelection'
                           head={this.state.modalHead}
                           selection={true}
                           handleSubmit={this.state.handleSubmit}
                           files={Object.entries(this.state.loadContents).map(function(item){
                            return (
                              {text: item[0], value: item[1]}
                              )})}/>
              ) : (null)}

          </div>
        );
    }
}

class DropDown extends React.Component {
    constructor(props) {
      super(props);
      //this.items = props.items;
      this.state = {};
      if (props.items.length != 0)
      {
        this.state = { 
          selectedOption: props.items[0].value,
          items: props.items };
      } else
      {
        this.state = { 
          selectedOption: -1,
          items: props.items };
      }
      this.handleOptionChange = this.handleOptionChange.bind(this);
    }

    componentWillReceiveProps(nextProps)  // called when receiving new Props
    {
      this.setState({
        selectedOption: nextProps.items[0].value,
        items: nextProps.items
      })
    }

    handleOptionChange(changeEvent) {
      if (this.state.items.length === 1)
      {
        this.setState({
          selectedOption: this.props.items[0].value
        });
      } else
      {
        this.setState({
          selectedOption: changeEvent.target.value
        });
      }
    }

    render() {
        return (
          <select className="dropdown" id={this.props.id} value={this.state.selectedOption} onChange={this.handleOptionChange}>
          {this.state.items.map(function(item, i){
            return(<option value={item.value} key={i}>{item.text}</option>)
          })}
          </select>
        );
    }
}

class SelectionsButton extends React.Component {
  constructor(props) {
    super(props);
    this.items = props.text;
    this.handleClicked = this.handleClicked.bind(this);
  }

  handleClicked() {

    this.props.function();

  }

  render() {
    return ( 
      <button className={this.props.button_class} id={this.props.button_id} disabled={this.props.disabled} onClick={this.handleClicked}>
        {this.props.text}
      </button>
    );
  }
}

class ModalDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selection: props.selection,
      selected: false
    }
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    // When something is selected, the "Load" button gets active.
    this.setState({selected: true});
  }

  handleSubmit()
  {
    this.props.handleSubmit();
  }

  render() {
    return ( 
      <div className="modalDialog" id={this.props.id}>
          <div className="modalHeading">
              <h4>
                {this.props.head}
              </h4>
          </div>
              {this.state.selection ? (
                <div className="modalBody">
                {this.props.files.length > 0 ? (
                  <select className="selectionWindow" size="2" id='loadFiles' onChange={this.handleChange.bind(this)}>
                    {this.props.files.map((item, i)=>{
                        return (<option value={item.value} key={i}>{item.text}</option>)
                      })}
                  </select>
                  ) : (
                  <select className="selectionWindow" size="2" disabled>
                    <option value='Loading...' key='0'>Loading...</option>
                  </select>
                  )}
                  <div className="selectedInfo">
                      <p>File</p>
                      <p>Type</p>
                      <p>Date</p>
                      <p>Author</p>
                  </div>
                </div>)
              : (
                <div className="modalBody">
                  <p>{this.props.messageText}</p>
                </div>
                )}
          <div className="modalFooting">
              <div className="modalButtons">
              {this.state.selection ? (
                  <div>
                    <button className="modalButton" onClick={this.handleSubmit.bind(this)} disabled={this.props.files.length == 0 || !this.state.selected}>Load</button>
                    <button className="modalButton" onClick={app.closeModal.bind(app)}>Cancel</button>
                  </div>
                  ) : (
                  <button className="modalButton" onClick={app.closeModal.bind(app)}>Ok</button>
                  )}
              </div>
          </div>
      </div>
    );
  }
}

var makeGUI = function()
{
  var gui = ReactDOM.render(
      <GuiButtons/>,
      document.getElementById('gui_body')
  );

  document.getElementById('uploadAnchorElem').addEventListener('change', app.handleFileUpload.bind(app), false);
}

// Try exporting GUI for testing
try
{
    module.exports = {
      GuiButtons: GuiButtons,
      DropDown: DropDown,
      SelectionsButton: SelectionsButton,
      makeGUI: makeGUI
      };
}
catch(err)
{
}
