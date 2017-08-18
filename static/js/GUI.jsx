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
        hidden: true
      }
    }

    componentWillMount() {
      app.synapseNeuronModelCallback = (data) => {
        // `this` refers to our react component
        this.setState({neuronModels: data[0], synapseModels: data[1]});
      };
      app.setShowGUI = (show) => { // TODO: is using "display: none" needed?
        // `this` refers to our react component
        this.setState({hidden: !show});
      };
    }

    render() {
        return (
          <div id="reactroot" style={this.state.hidden ? {display: "none"} : {display: "block"}}>

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
                button_id='ellipticalButton' text="&#x2b2c;" function={function () {app.makeEllipticalShape();}} />
                <br/>
                <SelectionsButton text='Make mask box'
                    disabled={app.is3DLayer}
                    function={function () {app.makeMaskBox();}}
                    button_class ='button'
                    button_id='maskBoxButton' />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Stimulation device
                </div>
                <SelectionsButton text='poissonGenerator'
                    function={function () {app.makeStimulationDevice("poisson_generator");}}
                    button_class ='button pill big'
                    button_id='poissonButton' />
                <br/>
                <SelectionsButton text=' ac Generator'
                    function={function () {app.makeStimulationDevice("ac_generator");}}
                    button_class ='button pill big'
                    button_id='acButton' />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Recording device
                </div>
                <SelectionsButton text='voltmeter' 
                    function={function () {app.makeRecordingDevice("voltmeter");}}
                    button_class ='button pill big'
                    button_id='voltmeterButton' />
                <br/>
                <SelectionsButton text='spikeDetector'
                    function={function () {app.makeRecordingDevice("spike_detector");}}
                    button_class ='button pill big'
                    button_id='spikeDetectorButton' />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Buttons!
                </div>
                <div className="button-group">
                    <SelectionsButton text='Connect'
                                      function={app.makeConnections.bind(app)} button_class ='button wide'
                                      button_id='getSelectionsButton'/>
                    <SelectionsButton text='Simulate'
                                      function={app.runSimulation.bind(app)} button_class ='button wide'
                                      button_id='runSimulationButton'/>
                </div>
                <hr/>
                <div className="button-group">
                    
                    <SelectionsButton text='Save'
                                      function={app.saveSelection.bind(app)} button_class ='button wide'
                                      button_id='saveSelectionButton'/>
                    <a id="downloadAnchorElem" style={{display: "none"}}/>
                    <input id="uploadAnchorElem" type="file" style={{display: "none"}}/>
                    <SelectionsButton text='Load'
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

    componentWillReceiveProps(nextProps)  // called when recieving new Props
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
      <button className={this.props.button_class} id={this.props.button_id} disabled={this.props.disabled-1} onClick={this.handleClicked}>
        {this.props.text}
      </button>
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
