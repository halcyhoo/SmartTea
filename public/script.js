class StartHeat extends React.Component {

  constructor() {
    super();
    this.state = {
        tempSelect: "100",
        keepWarm: false,
    };
  }

  submit = (e) =>{
    e.preventDefault();
    this.props.socket.emit("startHeat", {t: this.state.tempSelect, keepWarm: this.state.keepWarm});
  }

  changeState = (key, value) => {
    let state = this.state;
    state[key] = value
    this.setState(state);
  }

  render(){
    return <form onSubmit={this.submit} id="startHeat">
      <div className="form-group">
        <label htmlFor="tempSelect">Heating temperature</label>
        <select className="form-control" id="tempSelect" name="tempSelect" onChange={(e)=>this.changeState("tempSelect",e.target.value)}>
          <option value="100">100</option>
          <option value="98">98</option>
          <option value="96">96</option>
          <option value="94">94</option>
          <option value="92">92</option>
          <option value="90">90</option>
          <option value="30">30</option>
          <option value="29">29</option>
          <option value="28">28</option>
          <option value="27">27</option>
          <option value="26">26</option>
          <option value="25">25</option>
        </select>
      </div>

      <div className="form-group form-check">
        <input className="form-check-input" name="keepWarm" type="checkbox" id="keepWarm"  onChange={(e)=>this.changeState("keepWarm",e.target.checked)} />
        <label htmlFor="keepWarm">Keep Warm?</label>
      </div>

      <input className="btn btn-primary" type="submit" value="Start"/>
    </form>;
  }
}

class TempGauge extends React.Component {

  constructor() {
    super();
    this.state = {
        minTemp: 10,
        maxTemp: 110,
    };

  }

  render(){
    let height = (this.props.temp - this.state.minTemp) / (this.state.maxTemp - this.state.minTemp) * 100 + "%";
    return <div id="termometer">
      <div id="temperature" style={{height}} data-value={`${this.props.temp}°C`}></div>
      <div id="graduations"></div>
    </div>;
  }
}

class Cancel extends React.Component {

  cancel = (e) =>{
    e.preventDefault();
    this.props.socket.emit("cancel");
  }

  render(){
    return <button id="cancel" onClick={this.cancel} className="btn btn-primary">Cancel</button>;
  }
}


class DisplaySchedules extends React.Component {
  render(){
    return <div>
      <h3>Schedules</h3>
      <ul>
        {this.props.schedules && this.props.schedules.length != 0 && this.props.schedules.map(schedule=>{
          return <li key={schedule.id}>
            <p>Schedule code: {schedule.cronString}</p>
            <p>Temperature: {schedule.temp}°C</p>
            {schedule.keepWarm &&
               <p>Keep Warm</p>
            }
            {!schedule.keepWarm &&
               <p>Don't keep Warm</p>
            }
          </li>
        })}
      </ul>
    </div>
  }
}

class ClearSchedule extends React.Component {

  cancel = (e) =>{
    e.preventDefault();
    this.props.socket.emit("clearSchedules");
  }

  render(){
    return <button id="clear" onClick={this.cancel} className="btn btn-primary">Clear</button>;
  }
}

class AddSchedule extends React.Component {
  constructor() {
    super();
    this.state = {
        schedule: false,
        tempSelect: false,
        keepWarm: false,
    };

  }

  submit = (e) =>{
    e.preventDefault();
    this.props.socket.emit("addSchedule", {schedule: this.state.schedule, t: this.state.tempSelect, keepWarm: this.state.keepWarm});
  }

  changeState = (key, value) => {
    let state = this.state;
    state[key] = value
    this.setState(state);
  }

  render(){
    return <form onSubmit={this.submit} id="addSchedule">
      <div className="form-group">
        <label htmlFor="s_schedule">Schedule</label>
        <input type="text" name="s_schedule" className="form-control" onChange={(e)=>this.changeState("schedule",e.target.value)} />
      </div>

      <div className="form-group">
        <label htmlFor="s_tempSelect">Heating temperature</label>
        <select className="form-control" id="s_tempSelect" name="s_tempSelect" onChange={(e)=>this.changeState("tempSelect",e.target.value)}>
          <option value="100">100</option>
          <option value="98">98</option>
          <option value="96">96</option>
          <option value="94">94</option>
          <option value="92">92</option>
          <option value="90">90</option>
          <option value="30">30</option>
          <option value="29">29</option>
          <option value="28">28</option>
          <option value="27">27</option>
          <option value="26">26</option>
          <option value="25">25</option>
        </select>
      </div>

      <div className="form-group form-check">
        <input className="form-check-input" name="s_keepWarm" type="checkbox" id="s_keepWarm"  onChange={(e)=>this.changeState("keepWarm",e.target.checked)} />
        <label htmlFor="s_keepWarm">Keep Warm?</label>
      </div>

      <input className="btn btn-primary" type="submit" value="Schedule"/>
    </form>;
  }
}

class App extends React.Component {
  constructor() {
    super();
    this.state = {
        temp: false,
        socket: false,
        targetTemp: false,
        schedules: false,
    };
  }

  componentDidMount() {
    const socket = io("http://192.168.0.11:8080/");
    this.setState({socket});
    socket.on("temp", data => {
      this.setState({temp: data});
    });

    socket.on("state", data => {
      this.setState({state: data});
	console.log("state", data);
    });

    socket.on("targetTemp", data => {
      this.setState({targetTemp: data});
    });

    socket.on("schedules", data => {
      this.setState({schedules: data});
    });

  }

  render() {
    return <div className="container-fluid">
      <h1>SmartTea</h1>
      <div className="row">
        <div className="col-sm-3">

        </div>
        <div className="col-sm-3">
          {this.state.state == "off" &&
            <StartHeat socket={this.state.socket}/>
          }
          {this.state.state == "cancel" &&
            <h3>Cancelling heat up</h3>
          }
          {this.state.state == "heating" &&
            <div>
              <h2>Heating up to {this.state.targetTemp}°C</h2>
              <Cancel socket={this.state.socket}/>
            </div>
          }
          {this.state.state == "keepingWarm" &&
            <div>
              <h2>Keeping your water at {this.state.targetTemp}°C</h2>
              <Cancel socket={this.state.socket}/>
            </div>
          }
        </div>
        <div className="col-sm-3">
          <TempGauge temp={this.state.temp}/>
        </div>
        <div className="col-sm-3">

        </div>
      </div>

      <div className="row">
        <div className="col-sm-3"></div>
        <div className="col-sm-3">
          <AddSchedule socket={this.state.socket}/>
        </div>
        <div className="col-sm-3">
          <DisplaySchedules schedules={this.state.schedules}/>
          <ClearSchedule socket={this.state.socket}/>
        </div>
      </div>


    </div>;
  }
}

const domContainer = document.querySelector('#app');
ReactDOM.render(<App/>, domContainer);
