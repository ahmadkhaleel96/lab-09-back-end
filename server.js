'use strict';

// dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');

// using dependencies
const server = express();
server.use(cors());
require('dotenv').config();

// Ports and APIs
const PORT = process.env.PORT || 5500;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const DARKSKY_API_KEY = process.env.DARKSKY_API_KEY;
const EVENTFUL_API_KEY = process.env.EVENTFUL_API_KEY;
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', (err) => console.error(err));

// to check if the server is listening
client
	.connect()
	.then(() => {
		server.listen(PORT, () => console.log(`Listening to PORT ${PORT}`));
	})
	.catch((err) => {
		throw `Error happened ${err}`;
	});
// main route
server.get('/', (request, response) => {
	response.status(200).send('Welcome, i love that you love that i love that you love, my empty page hahaha.');
});

// location route, locations constructor function, handler and the get with superagent.

// the server get.
server.get('/location', locationHandler);

// the location's constructor function.

function Location(city, locationData) {
	this.formatted_query = locationData[0].display_name;
	this.latitude = locationData[0].lat;
	this.longitude = locationData[0].lon;
	this.search_query = city;
}

// the location handler function

function locationHandler(request, response) {
	let city = request.query.city;
	let sql = 'SELECT * FROM lab08 WHERE search_query = $1';
	let safeValues = [ city ];
	client
		.query(sql, safeValues)
		.then((results) => {
			response.status(200).json(results.rows);
		})
		.catch(
			server.use((error, request, response) => {
				response.send(500).send(error);
			})
		);

	getLocationData(city).then((data) => {
		response.status(200).send(data);
	});
}

// get function with superagent.

function getLocationData(city) {
	const url = `https://eu1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&q=${city}&format=json&limit=1`;

	return superagent.get(url).then((data) => {
		let location = new Location(city, data.body);
		return location;
	});
}

// weather route, weathers constructor function, handler and the get with superagent.

// the server get
server.get('/weather', weatherHandler);

// the weather's constructor function.

function Weather(day) {
	this.time = new Date(day.time * 1000).toDateString();
	this.forecast = day.summery;
}

//the weather's handler function.

function weatherHandler(request, response) {
	let lat = request.query['latitude'];
	let lng = request.query['longitude'];
	console.log('lat', lat, 'lng', lng);
	getWeatherData(lat, lng).then((data) => {
		response.status(200).send(data);
	});
}

// get function with superagent.

function getWeatherData(lat, lng) {
	const url = `https://api.darksky.net/forecast/${DARKSKY_API_KEY}/${lat},${lng}`;
	return superagent.get(url).then((weatherData) => {
		//console.log(weatherData.body.daily.data);
		let weather = weatherData.body.daily.data.map((day) => new Weather(day));
		return weather;
	});
}

// event route, events constructor function, handler and the get with superagent.

// the server get

server.get('/events', eventfulHandler);

// constructor function

function Eventful(event) {
	this.link = event.url;
	this.name = event.title;
	this.event_date = event.start_time;
	this.summery = event.discreption;
}

//handler

function eventfulHandler(request, response) {
	let city = request.query.formatted_query;
	console.log('location', city);
	getEventfulData(city).then((data) => {
		response.status(200).send(data);
	});
}

// get function using superagent.

function getEventfulData(formatted_query) {
	const url = `http://api.eventful.com/json/events/search?app_key=${EVENTFUL_API_KEY}&location=${formatted_query}`;
	console.log('url', url);
	return superagent.get(url).then((eventData) => {
		let info = JSON.parse(eventData.text);
		// console.log('info',info.events.event)
		if (info.events) {
			console.log('hi', info.events);
			let event = info.events.event.map((day) => new Eventful(day));
			return event;
		}
	});
}

// The 404 Error message, when a route doesn't exist.

server.use('*', (request, response) => {
	response.status(404).send('sorry, page is not found');
});

// the 500 Error, when an error occurs.

server.use((error, request, response) => {
	response.send(500).send(error);
});
