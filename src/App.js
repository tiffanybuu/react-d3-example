import React, { Component } from 'react';
import './App.css';
import Map from './Map.js'
import Intro from './Intro.js'
import { Switch, Route, Link} from 'react-router-dom'
import * as d3 from "d3";
import * as topojson from "topojson";

  // Define path generator
  const path = d3.geoPath() // path generator that will convert GeoJSON to SVG paths
  const parseTime = d3.timeParse('%Y-%m-%d');

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      social_capital_states: {},
      states_albers:{},
      covid_cases_states:{}
    };
  }


  componentDidMount = () => {
    // let currentC = this;

    // d3.csv("social-capital-states.csv").then(function(data) {
    //   data.forEach(function (d, i) {
    //     // console.log(i)
    //     d.State_Level_Index = parseFloat(d.State_Level_Index);
    //     d.rank_percentage = i/50.00;
    //     // rank out of 50 states plus DC = 51
    //     d.rank = i+1;
    //   })

    //   currentC.setState({social_capital_states: data})

    //   d3.json("states-albers-10m.json").then(function(us) {
    //     var feat = topojson.feature(us, us.objects.states).features;

    //     // https://bl.ocks.org/wboykinm/dbbe50d1023f90d4e241712395c27fb3
    //     for (var i = 0; i < data.length; i++) {

    //       const dataState = data[i].State;
    //       const dataValue = parseFloat(data[i].State_Level_Index);

    //       const dat = feat.find(d => d.properties.name == dataState);
    //       dat.properties.social_index = dataValue;

    //     }
    //     currentC.setState({states_albers: us})
        
    //     d3.json("covid_cases_states.json").then(function(cov_data) {

    //       cov_data.forEach(function(d,i) {
    //         d.date = parseTime(d.date);
    //         d.states = d.states;

    //         for (var i = 0; i < d.states.length; i++) {
    //           const dataState = d.states[i].state;
    //           const dat = feat.find(d => d.properties.name == dataState);
    //           d.states[i].centroid = path.centroid(dat)

    //         }
    //       })
    //       currentC.setState({covid_cases_states: cov_data})

    //     });
    
    //   })
    // })
  }

  render() {
    return (
      <div className="App">
          <Switch>
            <Route exact path='/' component={Intro}/>
            <Route path='/map' component={Map}/>
          </Switch>
      </div>
    );
  }
}

export default App;
