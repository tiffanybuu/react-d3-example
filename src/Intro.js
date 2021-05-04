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
          covid_cases_states:{},
          social_capital_counties: {},
          county_albers: {},
          covid_cases_counties: {},
        };
    }


    componentDidMount = () => {
        let currentC = this;

        d3.csv("social-capital-states.csv").then(function(data) {
          data.forEach(function (d, i) {
            // console.log(i)
            d.State_Level_Index = +d.State_Level_Index;
            d.rank_percentage = i/50.00;
            // rank out of 50 states plus DC = 51
            d.rank = i+1;
            
            d.Family_Unity = +d.Family_Unity;
            d.Community_Health = +d.Community_Health;
            d.Institutional_Health = +d.Institutional_Health;
            d.Collective_Efficacy = +d.Collective_Efficacy;
          })

          currentC.setState({social_capital_states: data})

          d3.json("states-albers-10m.json").then(function(us) {
            var feat = topojson.feature(us, us.objects.states).features;

            // https://bl.ocks.org/wboykinm/dbbe50d1023f90d4e241712395c27fb3
            for (var i = 0; i < data.length; i++) {

              const dataState = data[i].State;
              const sci = +data[i].State_Level_Index;
              const fu = +data[i].Family_Unity;
              const ih = +data[i].Institutional_Health;
              const ce = +data[i].Collective_Efficacy;
              const ch = +data[i].Community_Health;

              const dat = feat.find(d => d.properties.name == dataState);
              dat.properties.social_index = sci;
              dat.properties.family_unity = fu;
              dat.properties.institutional_health = ih;
              dat.properties.collective_efficacy = ce;
              dat.properties.community_health = ch;

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

        d3.csv("social-capital-counties.csv").then(function(data) {
            data.forEach(function (d, i) {
                d.County_Level_Index = parseFloat(d.County_Level_Index);
                d.rank_percentage = i/2992.00;
                // rank out of 2992 counties with data
                d.rank = i+1;

                d.Family_Unity = parseFloat(d.Family_Unity);
                d.Community_Health = parseFloat(d.Community_Health);
                d.Institutional_Health = parseFloat(d.Institutional_Health);
                d.Collective_Efficacy = parseFloat(d.Collective_Efficacy);
            })

            currentC.setState({social_capital_counties: data})

            d3.json("counties-albers-10m.json").then(function(counties) {
                var feat = topojson.feature(counties, counties.objects.counties).features
                for (var i = 0; i < data.length; i++) {

                    const dataFips = data[i].FIPS_Code;
                    // const dataValue = parseFloat(data[i].County_Level_Index);
                    const sci = data[i].County_Level_Index;
                    const fu = data[i].Family_Unity;
                    const ih = data[i].Institutional_Health;
                    const ce = data[i].Collective_Efficacy;
                    const ch = data[i].Community_Health;

                    const dat = feat.find(d => d.id == dataFips);
                    dat.properties.social_index = sci;
                    dat.properties.family_unity = fu;
                    dat.properties.institutional_health = ih;
                    dat.properties.collective_efficacy = ce;
                    dat.properties.community_health = ch;


                }
                currentC.setState({county_albers: counties})

                d3.json("covid_cases_counties.json").then(function(cov_data) {

                    cov_data.forEach(function(d,i) {

                      d.date = parseTime(d.date);
                      d.counties = d.counties;

                      for (var i = 0; i < d.counties.length; i++) {
                        const dataFips = d.counties[i].fips;
                        const dat = feat.find(d => d.id == dataFips);
                        d.counties[i].centroid = path.centroid(dat)
                      }
                    })
                    currentC.setState({covid_cases_counties: cov_data})

                  });

              })
        })


      }

    render() {
      // console.log(this.state)
        return (
            <div className="Intro">
                <h1>Social Capital Index (SCI) and Covid Maps</h1>
                <p> Social capital is defined as the “social assets” a person has - their relationships with other people and groups (family, friends, employers, the community, etc).
                    Having more social capital means you are more likely to find resources you might need through the connections you have.
                    Research has shown that social capital inequality is correlated with public health. A lack of social capital within a population can indicate increased rates of mortality, obesity, diabetes, and sexually-transmitted disease.
                    There has been some research that found that counties/states with higher social capital indices generally have lower rates fo COVID cases (https://www.medrxiv.org/content/10.1101/2020.04.23.20077321v1).
                    Our project aims to visualize the relationship between Social Capital and Covid Cases across the United States.
                    <br></br>
                    Note: Counties shown in black are not ranked due to missing data.
                    <br></br>
                    Datasets used: [add]
                </p>
                <Link to= {{
                    pathname: "/map",
                    state: this.state,
                    cov_counties: this.state.covid_cases_counties,
                    }}>
                    <button>Click Here to View Maps</button>
                </Link>
            </div>

        )
    }
}

export default Intro;
