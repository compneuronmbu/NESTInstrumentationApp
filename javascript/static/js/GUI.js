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
                neuronModels.map(function(model){return ({value: model, text: model});})}
                        id='neuronType' />
            </div>

            <div id="gui-box">
              <div id="gui-box-title">
                Synapse model
              </div>
              <DropDown items={
                synModels.map(function(model){return ({value: model[1], text: model[1]});})}
                        id='synapseModel' />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Mask shape
                </div>
                <RadioButtons items={[{value:'Rectangle'}]}
                              name='maskShape'/>
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Stimulation device
                </div>
                <SelectionsButton text='poissonGenerator'
                    function={function () {makeStimulationDevice("poisson_generator");}}
                    button_id='poissonButton' />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Recording device
                </div>
                <SelectionsButton text='voltmeter' 
                    function={function () {makeRecordingDevice("voltmeter");}}
                    button_id='voltmeterButton' />
                <SelectionsButton text='spikeDetector'
                    function={function () {makeRecordingDevice("spike_detector");}}
                    button_id='spikeDetectorButton' />
            </div>

            <div id="gui-box">
                <SelectionsButton text='Connect'
                                  function={makeConnections} button_id='getSelectionsButton'/>
                <SelectionsButton text='Simulate'
                                  function={runSimulation} button_id='runSimulationButton'/>
            </div>

            <div id="gui-box">
                <a id="downloadAnchorElem" style={{display: "none"}}/>
                <SelectionsButton text='Save'
                                  function={saveSelection} button_id='saveSelectionButton'/>
                <input id="uploadAnchorElem" type="file" style={{display: "none"}}/>
                <SelectionsButton text='Load'
                                  function={loadSelection} button_id='loadSelectionButton'/>
            </div>

          </div>
        );
    }
}

class RadioButtons extends React.Component {
    constructor(props) {
      super(props);
      this.items = props.items;
      this.state = {
        selectedOption: this.items[0].value
      };
      // This binding is necessary to make `this` work in the callback
      this.handleOptionChange = this.handleOptionChange.bind(this);
      this.makeRadioButton = this.makeRadioButton.bind(this);
    }

    handleOptionChange(changeEvent) {
      this.setState({
        selectedOption: changeEvent.target.value
      });
    }

    makeRadioButton(item, i) {
      return (
        <label key={i}>
          <input type="radio" name={this.props.name} value={item.value} checked={this.state.selectedOption === item.value} onChange={this.handleOptionChange} />
          {item.value}<br/>
        </label>
      );
    }

    render() {
        return (
          <form>
            <div className="radiobutton">
            {this.props.items.map(this.makeRadioButton)}
            </div>
          </form>
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
      <button className="selectionsButton" id={this.props.button_id} onClick={this.handleClicked}>
        {this.props.text}
      </button>
    );
  }
}

var gui = ReactDOM.render(
    <GuiButtons/>,
    document.getElementById('gui_body')
);

document.getElementById('uploadAnchorElem').addEventListener('change', handleFileUpload, false);