DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS yelp;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(8,6),
  longitude NUMERIC(9,6)
);

CREATE TABLE weather (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(255),
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE yelp (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50),
  image_url VARCHAR(255),
  price VARCHAR(5),
  rating NUMERIC(3,2),
  url VARCHAR(255),
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  overview VARCHAR(255),
  average_votes NUMERIC(3,2),
  total_votes INTEGER,
  image_url VARCHAR(255),
  popularity NUMERIC(4,3),
  released_on VARCHAR(255),
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE meetup (
  id SERIAL PRIMARY KEY,
  
  name VARCHAR(255),
  creation_data VARCHAR(255),
  host VARCHAR(255),
  location_id INTEGER NOT NULL REFERENCES locations(id)
);