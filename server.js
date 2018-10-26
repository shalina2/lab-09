'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err', err => console.log(err));

const app = express();

app.use(cors());

app.get('/weather', searchWeatherData);
app.get('/yelp', getYelp);
app.get('/movies', getMovies);
app.get('/meetup', getMeetup);
app.get('/location', searchToLatLong);

function searchToLatLong(req, res) {
  const locationHandler = {
    query: req.query.data,

    cacheHit: results => {
      console.log('Got Data from SQL');
      res.send(results.rows[0]);
    },

    cacheMiss: () => {
      Location.fetchLocation(req.query.data).then( () => {
        let SQL = `SELECT * FROM locations WHERE search_query=$1`
        client.query(SQL, [req.query.data])
          .then( results => {
            res.send(results.rows[0]);
          });
        console.log('first');
      }
      );
    }
  };

  Location.lookupLocation(locationHandler);
}

Location.lookupLocation = handler => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1`;
  const values = [handler.query];

  return client
    .query(SQL, values)
    .then(result => {
      if (result.rowCount > 0) {
        handler.cacheHit(result);
      } else {
        handler.cacheMiss();
      }
    })
    .catch(console.error);
};

function Location(query, data) {
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}
Location.prototype.save = function() {
  let SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4);`;
  let values = Object.values(this);

  client.query(SQL, values);
};

Location.fetchLocation = query => {
  const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${
    process.env.GOOGLE_API_KEY
  }`;
  return superagent.get(URL).then(data => {
    console.log('Got Data from API');
    if (!data.body.results.length) {
      throw 'No Data';
    } else {
      let location = new Location(query, data.body.results[0]);
      // console.log(data.body);
      location.save();
      return location;
    }
  });
};

// app.get('/weather', (request,response) => {
//   const forcastData = searchWeatherData(request.query.data);
//   response.send(forcastData);
// });

function searchWeatherData(req, res) {


  const handler = {

    location: req.query.data,

    cacheHit: function(result) {
      res.send(result.rows);
    },

    cacheMiss: function() {
      Weather.fetch(req.query.data)
        .then(result => {
          res.send(result);
          console.log('second');
        })
        .catch(console.error);
    },
  };
  Weather.lookup(handler);
}

function Weather(day) {
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
  this.forecast = day.summary;
  // console.log(data.summary);
}

Weather.prototype.save = function(id) {
  const SQL = `INSERT INTO weather (forecast, time, location_id) VALUES ($1, $2, $3);`;
  const values = Object.values(this);
  console.log(values);
  values.push(id);
  client.query(SQL, values);
};

Weather.lookup = function(handler) {
  const SQL = `SELECT * FROM weather WHERE location_id=$1;`;
  client.query(SQL, [handler.location.id])
    .then(result => {
      if (result.rowCount > 0) {
        console.log('Got Data from SQL');
        handler.cacheHit(result);
      } else {
        console.log('got data from API');
        handler.cacheMiss();
      }
    })
    .catch(error => handleError(error));
};

Weather.fetch = function(location) {
  const URL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${location.latitude},${location.longitude}`;

  return superagent.get(URL)
    .then(result => {
      // console.log(result.body.daily);
      const weatherSummaries = result.body.daily.data.map(day => {
        const summary = new Weather(day);
        summary.save(location.id);
        return summary;
      });
      return weatherSummaries;
    });
};

function getYelp(req, res) {

  const handler = {
    location: req.query.data,

    cacheHit: function(result) {
      res.send(result.rows);
    },

    cacheMiss: function() {
      Yelp.fetch(req.query.data)
        .then(result => res.send(result))
        .catch(console.error);
    },
  };

  Yelp.lookup(handler);
}

function Yelp(data) {
  this.name = data.name;
  this.image_url = data.image_url;
  this.price = data.price;
  this.rating = data.rating;
  this.url = this.url;
}

Yelp.prototype.save = function(id) {
  const SQL = `INSERT INTO yelp (name, image_url, price, rating, url, location_id) VALUES ($1, $2, $3, $4, $5, $6);`;
  const value = Object.values(this);
  value.push(id);
  client.query(SQL, value);
}

Yelp.lookup = function(handler) {
  const SQL = `SELECT * FROM yelp WHERE location_id=$1;`;
  client.query(SQL, [handler.location.id])
    .then(result => {
      if (result.rowCount >0 ){
        console.log('Got from SQL')
        handler.cacheHit(result);
      } else {
        console.log('got data from API');
        handler.cacheMiss();
      }
    })
    .catch(error => handleError(error));
};

Yelp.fetch = function(location) {
  const URL = `https://api.yelp.com/v3/businesses/search?term=delis&latitude=${location.latitude}&longitude=${location.longitude}`;

  return superagent.get(URL)
    .set({ Authorization: 'Bearer ' + process.env.YELP_API_KEY })
    .then(result => {
      // console.log(result.body);
      const yelpSummaries = result.body.businesses.map(businesses => {
        const summary = new Yelp(businesses);
        summary.save(location.id);
        return summary;
      });
      return yelpSummaries;
    });
};


function getMovies(req, res) {

  const handler = {
    location: req.query.data,

    cacheHit: function(result) {
      res.send(result.rows);
    },

    cacheMiss: function() {
      Movie.fetch(req.query.data)
        .then(result => res.send(result))
        .catch(console.error);
    },
  };

  Movie.lookup(handler);
}

function Movie(data) {
  this.title = data.title;
  this.overview = data.overview;
  this.average_votes = data.vote_average;
  this.total_votes = data.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w200_and_h300_bestv2${
    data.poster_path
  }`;
  this.popularity = data.popularity;
  this.released_on = data.release_date;
}


Movie.prototype.save = function(id) {
  const SQL = `INSERT INTO movies (title, overview, average_votes, total_votes, image_url, popularity, released_on, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;
  const value = Object.values(this);
  value.push(id);
  client.query(SQL, value);
}

Movie.lookup = function(handler) {
  const SQL = `SELECT * FROM movies WHERE location_id=$1;`;
  client.query(SQL, [handler.location.id])
    .then(result => {
      if (result.rowCount >0 ){
        console.log('Got data from SQL')
        handler.cacheHit(result);
      } else {
        console.log('got data from API');
        handler.cacheMiss();
      }
    })
    .catch(error => handleError(error));
};

Movie.fetch = function(location) {
  const URL = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIES_API_KEY}&query=${location.search_query}`;
    console.log(URL)
  return superagent.get(URL)
    .then(result => {
      // console.log(result.body);
      const movieSummaries = result.body.results.map(movie => {
        const summary = new Movie(movie);
        summary.save(location.id);
        return summary;
      });
      return movieSummaries;
    });
};

function handleError(err, res) {
  console.error('ERR', err);
  if (res) res.status(500).send('Sorry, something went wrong');
}


function getMeetup(req, res) {

    const handler = {
      location: req.query.data,
  
      cacheHit: function(result) {
        res.send(result.rows);
      },
  
      cacheMiss: function() {
        Meetup.fetch(req.query.data)
          .then(result => res.send(result))
          .catch(console.error);
      },
    };
  
    Movie.lookup(handler);
  }
  /////////MEETUP//////
  function Meetup(data) {
    this.link = data.link;
    this.name = data.name;
    this.creation_data = data.creation_data;
    this.host = data.host;
    
  };
  
  
  Meetup.prototype.save = function(id) {
      
    const SQL = `INSERT INTO meetup (lnk,name,creation_data,host,location_id) VALUES ($1, $2, $3, $4,$5);`;
    const value = Object.values(this);
    value.push(id);
    client.query(SQL, value);
  }
  
  Meetup.lookup = function(handler) {
    const SQL = `SELECT * FROM meetup WHERE location_id=$1;`;
    client.query(SQL, [handler.location.id])
      .then(result => {
        if (result.rowCount >0 ){
          console.log('Got data from SQL')
          handler.cacheHit(result);
        } else {
          console.log('got data from API');
          handler.cacheMiss();
        }
      })
      .catch(error => handleError(error));
  };
  
  Meetup.fetch = function(location) {
    const URL = `https://api.meetup.com/2/events/?radius=25.0&order=time&group_urlname=ny-tech&offset=0&format=json&page=20&sig_id=123456780&sig=xxxxxx ${process.env.MEETUP_API_KEY}&query=${location.search_query}`
      console.log(URL)
     return superagent.get(URL)
      .then(result => {
        // console.log(result.body);
        const meetupSummaries = result.body.results.map(meetup => {
          const summary = new Meetup(meetup);
          summary.save(location.id);
          return summary;
        });
        return meetupSummaries;
      });
  };
  
  function handleError(err, res) {
    console.error('ERR', err);
    if (res) res.status(500).send('Sorry, something went wrong');
  }
  




app.listen(PORT, () => console.log(`App is up on ${PORT}`));

