import json
import os
import sys
import glob
import io
from datetime import datetime, date
from dateutil.parser import parse
from collections import defaultdict, OrderedDict
import pandas as pd
from sklearn import preprocessing



# parse through covid cases to make front-end retrieving easier
# df = pd.read_csv("us-states.csv")
df_pop = pd.read_csv("population.csv")
url = 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv'
df = pd.read_csv(url)


df_test = df.head(1000)

covid_rates_by_date = {}
for index, row in df.iterrows():
    date = row['date']
    state = row['state']
    county = row['county']
    cases = row['cases']
    fips = row['fips']

    if county == 'New York City':
        fips = 36061

    pop_row = df_pop.loc[df_pop['State'] == state]
    pop_state = 0.0
    covid_rate = 0.0
    if not (county == 'Unknown'):
        if not (pop_row.empty) and state != "Puerto Rico":
            pop_state = float(pop_row['Pop'])
            covid_rate = (cases / pop_state)
        else:
            continue

        if date not in covid_rates_by_date:
            covid_rates_by_date[date] = {}
            covid_rates_by_date[date]["counties"] = []
            covid_rates_by_date[date]["counties"].append({'county': county, 'state': state, 'fips': fips, 'cases': cases, 'covid_rate': covid_rate})
        else:
            covid_rates_by_date[date]["counties"].append({'county': county, 'state': state, 'fips': fips, 'cases': cases, 'covid_rate': covid_rate})

final = []
for key, value in covid_rates_by_date.items():
    dicts = {}
    if 'date' not in dicts:
        dicts['date'] = key
    if 'counties' not in dicts:
        dicts['counties'] = value['counties']
    final.append(dicts)
with open("public/covid_cases_counties.json", "w") as outfile:
    json.dump(final, outfile)
