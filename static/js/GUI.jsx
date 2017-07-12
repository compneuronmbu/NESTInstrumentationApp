
class GuiButtons extends React.Component{
    constructor() {
      super();
      this.state = {
        devices: [],
        newDevice: false
      }
    }

    render() {
        return (
          <div>

            <div id="gui-box">
              <div id="gui-box-title">
                Neuron type
              </div>
              <DropDown items={
                app.neuronModels.map(function(model){return ({value: model, text: model});})}
                        id='neuronType' />
            </div>

            <div id="gui-box">
              <div id="gui-box-title">
                Synapse model
              </div>
              <DropDown items={
                app.synModels.map(function(model){return ({value: model[1], text: model[1]});})}
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
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Stimulation device
                </div>
                <SelectionsButton text='poissonGenerator'
                    function={function () {app.makeStimulationDevice("poisson_generator");}}
                    button_class ='button pill big'
                    button_id='poissonButton' />
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
                                      function={app.makeConnections.bind(app)} button_class ='button'
                                      button_id='getSelectionsButton'/>
                    <SelectionsButton text='Simulate'
                                      function={app.runSimulation.bind(app)} button_class ='button'
                                      button_id='runSimulationButton'/>
                </div>
                <br/><a>------------</a><br/>
                <div className="button-group">
                    <a id="downloadAnchorElem" style={{display: "none"}}/>
                    <input id="uploadAnchorElem" type="file" style={{display: "none"}}/>
                    <SelectionsButton text='Save'
                                      function={app.saveSelection.bind(app)} button_class ='button'
                                      button_id='saveSelectionButton'/>
                    <SelectionsButton text='Load'
                                      function={app.loadSelection.bind(app)} button_class ='button'
                                      button_id='loadSelectionButton'/>
                </div>
                <br/><a>------------</a><br/>
                <div className="button-group">
                    <SelectionsButton text='Stream'
                                      function={app.streamSimulate.bind(app)} button_class ='button'
                                      button_id='streamButton'/>
                    <SelectionsButton text='Abort'
                                      function={app.abortSimulation.bind(app)} button_class ='button danger'
                                      button_id='streamButton'/>
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
          selectedOption: this.state.items[this.state.items.last].value
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
      <button className={this.props.button_class} id={this.props.button_id} onClick={this.handleClicked}>
        {this.props.text}
      </button>
    );
  }
}

var gui = ReactDOM.render(
    <GuiButtons/>,
    document.getElementById('gui_body')
);

document.getElementById('uploadAnchorElem').addEventListener('change', app.handleFileUpload.bind(app), false);
