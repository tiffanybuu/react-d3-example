import React, { Component } from 'react';
import { Switch, Route, Link} from 'react-router-dom'
import * as d3 from "d3";
import * as topojson from "topojson";


  // Define path generator
  const path = d3.geoPath() // path generator that will convert GeoJSON to SVG paths
  const parseTime = d3.timeParse('%Y-%m-%d');

class Intro extends Component {
    constructor(props) {
        super(props)
        this.state = {
          social_capital_states: {},
          states_albers:{},
          covid_cases_states:{}
        };
    }


    componentDidMount = () => {
        let currentC = this;
    
        d3.csv("social-capital-states.csv").then(function(data) {
          data.forEach(function (d, i) {
            // console.log(i)
            d.State_Level_Index = parseFloat(d.State_Level_Index);
            d.rank_percentage = i/50.00;
            // rank out of 50 states plus DC = 51
            d.rank = i+1;
          })
    
          currentC.setState({social_capital_states: data})
    
          d3.json("states-albers-10m.json").then(function(us) {
            var feat = topojson.feature(us, us.objects.states).features;
    
            // https://bl.ocks.org/wboykinm/dbbe50d1023f90d4e241712395c27fb3
            for (var i = 0; i < data.length; i++) {
    
              const dataState = data[i].State;
              const dataValue = parseFloat(data[i].State_Level_Index);
    
              const dat = feat.find(d => d.properties.name == dataState);
              dat.properties.social_index = dataValue;
    
            }
            currentC.setState({states_albers: us})
            
            d3.json("covid_cases_states.json").then(function(cov_data) {
    
              cov_data.forEach(function(d,i) {
                d.date = parseTime(d.date);
                d.states = d.states;
    
                for (var i = 0; i < d.states.length; i++) {
                  const dataState = d.states[i].state;
                  const dat = feat.find(d => d.properties.name == dataState);
                  d.states[i].centroid = path.centroid(dat)
    
                }
              })
              currentC.setState({covid_cases_states: cov_data})
    
            });
        
          })
        })
      }

    render() {
        return (
            <div className="Intro">
                <h1>Social Capital Index (SCI) and Covid Maps</h1>
                <p> Social capital is defined as the “social assets” a person has - their relationships with other people and groups (family, friends, employers, the community, etc). 
                    Having more social capital means you are more likely to find resources you might need through the connections you have. 
                    Research has shown that social capital inequality is correlated with public health. A lack of social capital within a population can indicate increased rates of mortality, obesity, diabetes, and sexually-transmitted disease. 
                    There has been some research that found that counties/states with higher social capital indices generally have lower rates fo COVID cases (https://www.medrxiv.org/content/10.1101/2020.04.23.20077321v1). 
                    Our project aims to visualize the relationship between Social Capital and Covid Cases across the United States.
                    <br></br>
                    <br></br>
                    Datasets used: [add]
                </p>
                <Link to= {{
                    pathname: "/map",
                    state: this.state,
                    }}>
                    <button>Click Here to View Maps</button>
                </Link>   
            </div>

        )
    }
}

export default Intro;
