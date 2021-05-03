import React, { Component, useEffect, useRef, useState} from 'react';
import * as d3 from "d3";
import * as topojson from "topojson";
import { sliderBottom } from 'd3-simple-slider';
import { easeLinear, select } from "d3";
import { Switch, Route, Link} from 'react-router-dom';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';

// install material ui

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
    const [covid_cases_counties] = useState(data.covid_cases_counties)
    const [social_capital_counties] = useState(data.social_capital_counties)

    const [index_range] = useState(d3.extent(social_capital_states.map(d => d.State_Level_Index)))
    const [index_range_counties] = useState(d3.extent(social_capital_counties.map(d => d.County_Level_Index)))
    const [select, setSelect] = useState('state')
    const color = d3.scaleQuantize().domain(index_range).range(["#042698", "#3651ac", "#687cc1", "#9aa8d5", "#ccd3ea"])
    const color_county = d3.scaleQuantize().domain(index_range_counties).range(["#042698", "#3651ac", "#687cc1", "#9aa8d5", "#ccd3ea"])

    // console.log(covid_cases_counties)
    // function pauseAnimation(playButton) {
    //     clearInterval(timerID);
    //     playButton.text("▶️ Play");
    //     playButton.style("background-color", "#77DD77");
    // }

    // function animate(slider, playButton) {
    //     if (slider.value() >= slider.max()) {
    //       //pause automatically because we have reached the end of the time series
    //       pauseAnimation(timerID, playButton);
    //     } else {
    //       //increment value of slider by 1 day to render the next day
    //       var date = slider.value();
    //       date.setDate(date.getDate() + 1);
    //       slider.value(date);
    //     }
    // }


    function handleChange(event) {
        const value = event.target.value;
        setSelect(value)
    };

    // like componentDidMount, or whenever data passed in change
    useEffect(() => {
      const svg = d3.select(svgContainer.current)

      let spikes_g;
      if (select === 'state') {
        svg.selectAll("*").remove();
        d3.selectAll('*.g-time-slider').remove();

        const slider = sliderBottom().tickFormat(d3.timeFormat('%m/%d/%y'))
        .min(parseTime('2020-01-21')).max(parseTime('2021-03-22')).width(900)
        .on("onchange", (val) => {
          svg.selectAll('.spike_map').remove();
          update_spikes(val)
        });

        const time_slider = d3.select(".time-slider-svg")
          // .append('svg')
          .attr('width', 1000)
          .attr('height', 70)
          .append('g')
          .attr('class', 'g-time-slider')
          .attr('transform', 'translate(30,30)')

        time_slider.call(slider);

        const playButton = d3.select(".play-button");
        playButton.on("click", function() {
          if (d3.select(this).text() == "▶️ Play") {
            //change text and styling to indicate that the user can pause if desired
            d3.select(this).text("⏸Pause");
            d3.select(this).style("background-color", "#FF6961");

            //begin animation
            timerID = setInterval(animate, 50);
          } else {
            pauseAnimation();
          }
        })

        function pauseAnimation() {
          clearInterval(timerID);
          playButton.text("▶️ Play");
          playButton.style("background-color", "#77DD77");
        }
        function animate() {
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
        function update_spikes(date) {
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


              spikes_g = svg.append('g')
              .attr('transform', "translate(0,0)")
              .attr('class', 'spike_map')

              spikes_g.selectAll('path')
              .attr('transform', "translate(0,0)")
              .data(covid_data.states)
              .join(
                enter => {
                  const ll = enter.append('path')
                  .attr('transform', "translate(0,0)")

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

              // const zoom = d3.zoom()
              //   .scaleExtent([1,8])
              //   .on('zoom', zoomed)
              //   svg.call(zoom)
              //   spikes_g.call(zoom)

              //   function zoomed({transform}) {
              //     // d3.select('.spike_map').attr('transform', transform)
              //     g.attr('transform', transform)
              //     spikes_g.attr('transform', transform)

              //   }
          }

          const g = svg.append("g")
          .attr('id', 'states')
          .attr('transform', "translate(0,0)")
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

          const g_outline = svg.append("path")
              .attr('transform', "translate(0,0)")
              .datum(topojson.mesh(states_albers, states_albers.objects.states, (a, b) => a !== b))
              .attr("fill", "none")
              .attr("stroke", "white")
              .attr("stroke-linejoin", "round")
              .attr("d", path)



          const legend = svg.append("g")
          .attr("id", "legend")
          .attr('transform', "translate(-200,20)");

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

          //turn off zoom if in state view
          svg.on('.zoom', null);

        } else if (select === 'county') {
            const svg = d3.select(svgContainer.current)
            // d3.selectAll("*.time-slider-state").remove();
            svg.selectAll("*").remove();
            d3.selectAll('*.g-time-slider').remove();

            // black counties don't have enough data, add this information to info page
            // svg.append("g")
            // .attr('id', 'county')
            // .attr('transform', "translate(0,70)")
            // .selectAll("path")
            // .data(topojson.feature(county_albers, county_albers.objects.counties).features)
            // .join("path")
            // .attr("fill",d => color(d.properties.social_index))
            // .attr("d", path)

            const slider = sliderBottom().tickFormat(d3.timeFormat('%m/%d/%y'))
              .min(parseTime('2020-01-21')).max(parseTime('2021-03-22')).width(900)
              .on("onchange", (val) => {
                svg.selectAll('.spike_map').remove();
                update_spikes(val)
            });

            const time_slider = d3.select(".time-slider-svg")
              .attr('width', 1000)
              .attr('height', 70)
              .append('g')
              .attr('class', 'g-time-slider')
              .attr('transform', 'translate(30,30)')

            time_slider.call(slider);

            const playButton = d3.select(".play-button");


            playButton.on("click", function() {
              if (d3.select(this).text() == "▶️ Play") {
                //change text and styling to indicate that the user can pause if desired
                d3.select(this).text("⏸Pause");
                d3.select(this).style("background-color", "#FF6961");

                //begin animation
                timerID = setInterval(animate, 50);
              } else {
                pauseAnimation();
              }
            })

            function pauseAnimation() {
              clearInterval(timerID);
              playButton.text("▶️ Play");
              playButton.style("background-color", "#77DD77");
            }
            function animate() {
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
            function update_spikes(date) {
              const covid_data = (covid_cases_counties.find(d =>
                  d.date.getMonth() == date.getMonth() &&
                  d.date.getDay() == date.getDay() &&
                  d.date.getYear() == date.getYear()
                  ))

              // calculating centroids of each state for spike location and adding
              // to covid data
              const length = d3.scaleLinear().domain(d3.extent(covid_data.counties, d => d.covid_rate))
                  .range([0,150]);

              function spike(length, width=7) {
                  return `M${-width / 2},0L0,${-length}L${width / 2},0`
              }

              //legend detailing what the sizes of the spikes mean
              //remove old legend
              svg.select("g.spike_legend").remove();

              //calculate min and max covid rate
              const extent = d3.extent(covid_data.counties, d => d.covid_rate);
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
                  .attr('transform', "translate(0,0)")
                  .attr('class', 'spike_map')

                  spikes_g.selectAll('path')
                  .attr('transform', "translate(0,0)")
                  .data(covid_data.counties)
                  .join(
                    enter => {
                      const ll = enter.append('path')
                      .attr('transform', "translate(0,0)")

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

                          // const x = d.centroid[0] + current_transform.x
                          // const y = d.centroid[1] + current_transform.y
                          // return "translate(" + x + ',' + y + ")";
                        }
                        return `translate(0,-80)`
                      })
                      // .attr('scale', current_transform.k)
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
                  // .attr('transform', transform(d3.zoomIdentity));


                  // function transform(t) {
                  //   console.log('transform')
                  //   return function(d) {
                  //     return "translate(" + t.apply(d) + ")";
                  //   };
                  // }

                  if (lastHovered != undefined) {
                  let covid_date = covid_cases_counties.find(d =>
                    d.date.getMonth() == date.getMonth() &&
                    d.date.getDay() == date.getDay() &&
                    d.date.getYear() == date.getYear()
                    );

                  let id = lastHovered.id
                  var county = covid_date.counties.find(d=>d.fips == id)
                  if (county != undefined) {
                  let rate = parseFloat(county.covid_rate);
                  let rate_str = rate < .0001 ? "~0%" : formatPercent(rate);
                  let cases = county.cases;

                  d3.select(".tooltip")
                    .html("<b>"+lastHovered.properties.name+"</b> <br/>"
                    +"SCI: "+lastHovered.properties.social_index
                    +"<br/> Ranks <b>#"+(2992 - parseFloat(social_capital_counties.find(da => da.FIPS_Code == lastHovered.id ).rank)) + "</b> out of 2992 counties with data"
                    +"<br/> Covid Case Rate: "+rate_str
                    +"<br/> Covid Cases: "+formatKilo(cases))
                  }
                }
              const current_transform = d3.zoomTransform(g.node());
              console.log(current_transform);
              svg.selectAll(".spike_map").attr('transform', current_transform);
            }



            const g = svg.append("g")
            .attr('id', 'counties')
            .attr('transform', "translate(0,0)")
            .selectAll("path")
            .data(topojson.feature(county_albers, county_albers.objects.counties).features)
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
                var id = d.id
                var date = slider.value()

                var covid_date = (covid_cases_counties.find(d =>
                    d.date.getMonth() == date.getMonth() &&
                    d.date.getDay() == date.getDay() &&
                    d.date.getYear() == date.getYear()
                  ))

                var county = covid_date.counties.find(d=>d.fips == id)

                var rate = 0
                var cases = 0
                if(county){
                    rate = parseFloat(county.covid_rate)
                    cases = county.cases
                }
                let rate_str = rate < .0001 ? "~0%" : formatPercent(rate);

                d3.select(".tooltip")
                .style("left", `${d3.pointer(mouseEvent)[0]}px`)
                .style("top", `${d3.pointer(mouseEvent)[1]}px`).attr("data-html", "true")
                .html("<b>"+d.properties.name+"</b> <br/>"
                +"SCI: "+d.properties.social_index
                +"<br/> Ranks <b>#"+(2992 - parseFloat(social_capital_counties.find(da => da.FIPS_Code == d.id).rank)) + "</b> out of 2992 counties with data"
                +"<br/> Covid Case Rate: "+rate_str
                +"<br/> Covid Cases: "+formatKilo(cases))
            })
            .on("mouseout", (mouseEvent, d) => {/* Runs when mouse exits a rect */
                d3.select(".tooltip").attr("style","opacity:0")
            })

            // const g_outline = svg.append("path")
            //     .attr('transform', "translate(0,70)")
            //     .datum(topojson.mesh(county_albers, county_albers.objects.counties, (a, b) => a !== b))
            //     .attr("fill", "none")
            //     .attr("stroke", "white")
            //     .attr("stroke-linejoin", "round")
            //     .attr("d", path)

            // ZOOM IN FUNCTION
            const zoom = d3.zoom()
            .scaleExtent([1,8])
            .on('zoom', zoomed)

            svg.call(zoom)


            function zoomed({transform}) {
              g.attr('transform', transform)
              svg.selectAll(".spike_map").attr('transform', transform)
            }

            // function transform_t(t) {
            //   console.log('transform')
            //   return function(d) {
            //     return "translate(" + t.apply(d) + ")";
            //   };
            // }

            const legend = svg.append("g")
            .attr("id", "legend")
            .attr('transform', "translate(-200,20)");

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
            .text("Lowest SCI (-4.3)")
            .attr('fill', 'black');

            legend.append("text")
            .attr("x", width+8)
            .attr("y", 0)
            .style("text-anchor", "end")
            .text("Highest SCI (2.9)")
            .attr('fill', 'black')
        }


    }, [select]);

    return (
        <div className='map'>
            <h1>Social Capital Index (SCI) vs. Covid Cases</h1>
            <div>
                <FormControl>
                    <Select
                        native
                        label="typeOfMap"
                        onChange = {handleChange}
                        inputProps={{
                            name: 'typeOfMap',
                            id: 'outlined-age-native-simple',
                        }}
                        >
                        <option value='state'>State-Level</option>
                        <option value='county'>County-Level</option>
                    </Select>
                </FormControl>
            </div>

            <svg className='map' width={svgWidth} height={svgHeight} ref={svgContainer}>
            </svg>
            <div className="tooltip">My tooltip!</div>
            <div className="time-slider" id="time-slider">
              <svg className='time-slider-svg'></svg>
            </div>

            {/* <div className="time-slider-state" id="time-slider-state"></div>
            <div className="time-slider-county" id="time-slider-county"></div> */}
            <button className="play-button">▶️ Play</button>

        </div>
    );

}
