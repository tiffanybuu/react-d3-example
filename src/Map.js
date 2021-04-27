import React, { Component, useEffect, useRef, useState} from 'react';
import * as d3 from "d3";
import * as topojson from "topojson";
import { sliderBottom } from 'd3-simple-slider';
import { easeLinear, select } from "d3";
import { Switch, Route, Link} from 'react-router-dom'

const padding = {top: 10, left: 100, right: 10, bottom: 80}
const svgWidth = 975;
const svgHeight = 680;
const height = svgHeight - padding.top - padding.bottom;
const width = svgWidth - padding.right - padding.left;


// number formatters
const formatSmall = d3.format(".2e");
const formatKilo = d3.format(".3~s");
const formatPercent = d3.format(".2%");


  // Define path generator
const path = d3.geoPath() // path generator that will convert GeoJSON to SVG paths
const parseTime = d3.timeParse('%Y-%m-%d');

let lastHovered = undefined;
var timerID = undefined;

const legend_color = ["#042698", "#3651ac", "#687cc1", "#9aa8d5", "#ccd3ea"];

export default function Map(props) {
    const svgContainer = useRef(null); 
    const data = props.location.state; 

    const [covid_cases_states] = useState(data.covid_cases_states)
    const [states_albers] = useState(data.states_albers)
    const [social_capital_states] = useState(data.social_capital_states)
    const [county_albers] = useState(data.county_albers)
    const [index_range] = useState(d3.extent(social_capital_states.map(d => d.State_Level_Index)))
    const [setSelect] = useState('state')
    const color = d3.scaleQuantize().domain(index_range).range(["#042698", "#3651ac", "#687cc1", "#9aa8d5", "#ccd3ea"])
    
    function pauseAnimation(playButton) {
        clearInterval(timerID);
        playButton.text("▶️ Play");
        playButton.style("background-color", "#77DD77");
    }

    function animate(slider, playButton) {
        if (slider.value() >= slider.max()) {
          //pause automatically because we have reached the end of the time series
          pauseAnimation(timerID, playButton);
        } else {
          //increment value of slider by 1 day to render the next day
          var date = slider.value();
          date.setDate(date.getDate() + 1);
          slider.value(date);
        }
    }
        // covid cases spike map
    function update_spikes(date, svg) {
        const covid_data = (covid_cases_states.find(d =>
            d.date.getMonth() == date.getMonth() &&
            d.date.getDay() == date.getDay() &&
            d.date.getYear() == date.getYear()
            ))

        // calculating centroids of each state for spike location and adding
        // to covid data
        const states = covid_data.states;
        // [0, d3.max(covid_data.states, d => d.covid_rate)]
        const length = d3.scaleLinear().domain(d3.extent(covid_data.states, d => d.covid_rate))
            .range([0,150]);

        function spike(length, width=7) {
            return `M${-width / 2},0L0,${-length}L${width / 2},0`
        }

        //legend detailing what the sizes of the spikes mean
        //remove old legend
        svg.select("g.spike_legend").remove();

        //calculate min and max covid rate
        const extent = d3.extent(covid_data.states, d => d.covid_rate);
        const min_rate = extent[0];
        const max_rate = extent[1];

        const spike_legend = svg.append("g")
            .attr("transform", "translate(850,200)")
            .attr("class", "spike_legend");

        if (min_rate == max_rate) {
            spike_legend.append('path')
            .attr('transform', "translate(" + 50 + ",300)")
            .attr('fill', 'red')
            .attr('fill-opacity', 0.6)
            .attr('stroke', 'red')
            .attr('d', spike(75));

            var covid_rate_num = parseFloat(min_rate)
            // console.log(covid_rate_num);
            let covid_rate_str = covid_rate_num < 0.0001 ? "~0%" : formatPercent(covid_rate_num);

            spike_legend.append("text")
            .attr("x", 50 + 13)
            .attr("y", 315)
            .style("text-anchor", "end")
            .text(covid_rate_str)
            .attr('fill', 'black');
        } else {
            for (var i = 1; i <= 3; i++) {
            spike_legend.append('path')
            .attr('transform', "translate(" + (i - 1) * 50 + ",300)")
            .attr('fill', 'red')
            .attr('fill-opacity', 0.6)
            .attr('stroke', 'red')
            .attr('d', spike(50 * i));

            var covid_rate_num = parseFloat((min_rate + (max_rate - min_rate) * (i / 3.0)))
            let covid_rate_str = covid_rate_num < 0.0001 ? "~0%" : formatPercent(covid_rate_num);

            spike_legend.append("text")
            .attr("x", (i - 1) * 50 + 13)
            .attr("y", 315)
            .style("text-anchor", "end")
            .text(covid_rate_str)
            .attr('fill', 'black');
            }
        }

            spike_legend.append("text")
            .attr("x", 125)
            .attr("y", 335)
            .style("text-anchor", "end")
            .text("Cumulative Cases / Population")
            .attr('fill', 'black');


            const spikes_g = svg.append('g')
            .attr('transform', "translate(0,70)")
            .attr('class', 'spike_map')

            spikes_g.selectAll('path')
            .attr('transform', "translate(0,70)")
            .data(covid_data.states)
            .join(
              enter => {
                const ll = enter.append('path')
                .attr('transform', "translate(0,70)")

                .attr('fill', 'red')
                .attr('fill-opacity', 0.6)
                .attr('stroke', 'red')
                .attr('d', (d) => {
                  if (d.centroid) {
                    return spike(length(d.covid_rate));
                  }
                })
                .attr('transform', (d) => {
                  if (!isNaN(d.centroid[0]) && !isNaN(d.centroid[1])) {
                    return `translate(${d.centroid})`
                  }
                  return `translate(0,-80)`
                })
              },
              update => update,
              exit => {
                exit.transition().duration(1000).ease(easeLinear)
                .attr('d', (d) => {
                  if (d.centroid) {
                    return spike(length(d.covid_rate))
                  }
                })
                .remove()
              }
            )
            if (lastHovered != undefined) {
            let covid_date = covid_cases_states.find(d =>
              d.date.getMonth() == date.getMonth() &&
              d.date.getDay() == date.getDay() &&
              d.date.getYear() == date.getYear()
              );
            let sname = lastHovered.properties.name
            let state = covid_date.states.find(d=>d.state == sname)
            if (state != undefined) {
            let rate = parseFloat(state.covid_rate);
            let rate_str = rate < .0001 ? "~0%" : formatPercent(rate);
            let cases = state.cases;
            
            d3.select(".tooltip")
              .html("<b>"+lastHovered.properties.name+"</b> <br/>"
              +"SCI: "+lastHovered.properties.social_index
              +"<br/> Ranks <b>#"+(52 - parseFloat(social_capital_states.find(da => da.State == lastHovered.properties.name).rank)) + "</b> out of 50 states and DC"
              +"<br/> Covid Case Rate: "+rate_str
              +"<br/> Covid Cases: "+formatKilo(cases))
            }}
          }

    function handleSelectChange(event) {
        const value = event.target.value;
        // setSelect(value)
    };

    // like componentDidMount, or whenever data passed in change
    useEffect(() => {
        const svg = d3.select(svgContainer.current)
        const active = d3.select(null);

        const slider = sliderBottom().tickFormat(d3.timeFormat('%m/%d/%y'))
          .min(parseTime('2020-01-21')).max(parseTime('2021-03-22')).width(900)
          .on("onchange", (val) => {
            svg.selectAll('.spike_map').remove();
            update_spikes(val, svg)
        });

        const time_slider = d3.select(".time-slider")
          .append('svg')
          .attr('width', 1000)
          .attr('height', 70)
          .append('g')
          .attr('transform', 'translate(30,30)')
        
        time_slider.call(slider);

        const playButton = d3.select(".play-button");


        playButton.on("click", function() {
          if (d3.select(this).text() == "▶️ Play") {
            //change text and styling to indicate that the user can pause if desired
            d3.select(this).text("⏸Pause");
            d3.select(this).style("background-color", "#FF6961");

            //begin animation
            timerID = setInterval(animate(slider, playButton), 50);
          } else {
            pauseAnimation(playButton);
          }
        })

        svg.append("g")
        .attr('id', 'states')
        .attr('transform', "translate(0,70)")
        .selectAll("path")
        .data(topojson.feature(states_albers, states_albers.objects.states).features)
        .join("path")
        .attr("fill",d => color(d.properties.social_index))
        .attr("d", path)
        .on("mouseover", (mouseEvent, d) => {
            lastHovered = d;
            // console.log(slider.value())
            // Runs when the mouse enters a rect.  d is the corresponding data point.
            // Show the tooltip and adjust its text to say the temperature.
            d3.select(".tooltip").text(d).attr("style","opacity:20");
        })
        .on("mousemove", (mouseEvent, d) => {
            lastHovered = d;
            var sname = d.properties.name
            var date = slider.value()
            var covid_date = covid_cases_states.find(d =>
                d.date.getMonth() == date.getMonth() &&
                d.date.getDay() == date.getDay() &&
                d.date.getYear() == date.getYear()
                )
            var state = covid_date.states.find(d=>d.state == sname)

            var rate = 0
            var cases = 0
            if(state){
                rate = parseFloat(state.covid_rate)
                cases = state.cases
            }
            let rate_str = rate < .0001 ? "~0%" : formatPercent(rate);
            
            d3.select(".tooltip")
            .style("left", `${d3.pointer(mouseEvent)[0]}px`)
            .style("top", `${d3.pointer(mouseEvent)[1]}px`).attr("data-html", "true")
            .html("<b>"+d.properties.name+"</b> <br/>"
            +"SCI: "+d.properties.social_index
            +"<br/> Ranks <b>#"+(52 - parseFloat(social_capital_states.find(da => da.State == d.properties.name).rank)) + "</b> out of 50 states and DC"
            +"<br/> Covid Case Rate: "+rate_str
            +"<br/> Covid Cases: "+formatKilo(cases))
        })
        .on("mouseout", (mouseEvent, d) => {/* Runs when mouse exits a rect */
            d3.select(".tooltip").attr("style","opacity:0")
        })
        // .on('click', clicked(active));

        svg.append("path")
            .attr('transform', "translate(0,70)")
            .datum(topojson.mesh(states_albers, states_albers.objects.states, (a, b) => a !== b))
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-linejoin", "round")
            .attr("d", path)
        
        // console.log(county_albers)
        // county map
        // svg.append("g")
        // .attr('id', 'counties')
        // .attr('transform', "translate(0,70)")
        // .selectAll("path")
        // .data(topojson.feature(county_albers, county_albers.objects.counties).features)
        // .join("path")
        // // .attr("fill",d => color(d.properties.social_index))
        // .attr("d", path)
        // // .on('click', reset)


        const legend = svg.append("g")
        .attr("id", "legend")
        .attr('transform', "translate(-200,80)");

        const legenditem = legend.selectAll(".legenditem")
        .data(d3.range(5))
        .enter()
        .append("g")
        .attr("class", "legenditem")
        .attr("transform", function(d, i) { return "translate(" + i * 31 + ",0)"; });

        legenditem.append("rect")
        .attr("x", width - 240)
        .attr("y", -7)
        .attr("width", 30)
        .attr("height", 8)
        .attr("class", "rect")
        .style("fill", function(d, i) { return legend_color[i]; });

        legend.append("text")
        .attr("x", width - 243)
        .attr("y", 0)
        .style("text-anchor", "end")
        .text("Lowest SCI (-2.15)")
        .attr('fill', 'black');

        legend.append("text")
        .attr("x", width+8)
        .attr("y", 0)
        .style("text-anchor", "end")
        .text("Highest SCI (2.08)")
        .attr('fill', 'black')

    }, []);
    
    return (
        <div className='map'>
            <h1>Social Capital Index (SCI) vs. Covid Cases</h1>
            <div >
                <input type="radio" value="State"  onChange={handleSelectChange}/> State
                <input type="radio" value="County" onChange={handleSelectChange}/> County
            </div>

            <svg className='map' width={svgWidth} height={svgHeight} ref={svgContainer}> 
            </svg>
            <div className="tooltip">My tooltip!</div>
            <div className="time-slider"></div>
            <button className="play-button">▶️ Play</button>

        </div>
    );

}
