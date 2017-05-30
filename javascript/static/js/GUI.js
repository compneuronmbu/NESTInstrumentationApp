class GuiButtons extends React.Component{
    constructor() {
    super();
    console.log("GuiButtons", modelParameters);
    }
    render() {
        return (
          <div>

            <div id="gui-box">
              <div id="gui-box-title">
                Projection
              </div>
              <DropDown items={[{value:'projection 1'},
                                {value:'projection 2'},
                                {value:'projection 3'},
                                {value:'projection 4'},
                                {value:'projection 5'}]}
                        id='projections' />
            </div>

            <div id="gui-box">
              <div id="gui-box-title">
                Neuron type
              </div>
              <DropDown items={[{value:'All'},
                                {value:'Excitatory'},
                                {value:'Inhibitory'}]}
                        id='neuronType' />
            </div>

            <div id="gui-box">
              <div id="gui-box-title">
                Synapse model
              </div>
              <DropDown items={[{value:'static_excitatory'}]}
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
                    Endpoint
                </div>
                <RadioButtons items={[{value:'Source'}, {value:'Target'}]}
                              name='endpoint'/>
            </div>

            <div id="gui-box">
                <SelectionsButton/>
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
      this.items = props.items;
      this.state = {
        selectedOption: this.items[0].value
      };
      this.handleOptionChange = this.handleOptionChange.bind(this);
    }

    handleOptionChange(changeEvent) {
      this.setState({
        selectedOption : changeEvent.target.value
      });
    }

    render() {
        return (
          <select className="dropdown"  id={this.props.id} onChange={this.handleOptionChange}>
          {this.props.items.map(function(item, i){
            return (
              <option value={item.value} key={i}>{item.value}</option>
            );
          })}
          </select>
        );
    }
}

class SelectionsButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleClicked = this.handleClicked.bind(this);
  }

  handleClicked() {
    console.log("This button doesn't do anything yet.");
    //console.log(selections);
  }

  render() {
    return ( 
      <button id="getSelectionsButton" onClick={this.handleClicked}>
        (Dummy button)
      </button>
    );
  }
}

ReactDOM.render(
    <GuiButtons/>,
    document.getElementById('gui_body')
);