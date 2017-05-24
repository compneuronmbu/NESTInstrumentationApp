class GuiButtons extends React.Component{
    constructor() {
    super();
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
                                {value:'projection 5'}]} />
            </div>

            <div id="gui-box">
              <div id="gui-box-title">
                Neuron type
              </div>
              <DropDown items={[{value:'All'},
                                {value:'Excitatory'},
                                {value:'Inhibitory'}]} />
            </div>

            <div id="gui-box">
              <div id="gui-box-title">
                Synapse model
              </div>
              <DropDown items={[{value:'static_excitatory'}]} />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Mask shape
                </div>
                <RadioButtons items={[{value:'Rectangle'}, {value:'Ellipse'}]} />
            </div>

            <div id="gui-box">
                <div id="gui-box-title">
                    Mask type
                </div>
                <RadioButtons items={[{value:'Source'}, {value:'Target'}]} />
            </div>

          </div>
        );
    }
}

class RadioButtons extends React.Component {
    constructor() {
    super();
    }
    render() {
        return ( 
            <div className="radiobuttons">
            {this.props.items.map(function(item, i){
              return (
                <label id={item.value} key={i}>{item.value}
                  <input type="radio"></input><br/>
                </label>
              );
            })}
            </div>
        );
    }
}

class DropDown extends React.Component {
    constructor() {
    super();
    }
    render() {
        return ( 
            <select className="dropdown">
            {this.props.items.map(function(item, i){
              return (
                <option value={item.value} key={i}>{item.value}</option>
              );
            })}
            </select>
        );
    }
}

ReactDOM.render(
    <GuiButtons/>,
    document.getElementById('gui_body')
);