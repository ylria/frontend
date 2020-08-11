import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  Map,
  TileLayer,
  CircleMarker,
  Marker,
  Circle,
  Tooltip,
  Polygon,
  SVGOverlay,
} from "react-leaflet";
import styles from "../../../style/main/components/MapComponent.scss";
import "leaflet/dist/leaflet.css";
import { getApiUrl } from "../../../config/ApiURL";
import AnimatedMapPopup from "./AnimatedMapPopup";
import { AirQualityColors, indexToLevel } from "../../../config/AirQuality";

import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

document.addEventListener("DOMContentLoaded", (event) => {
  try {
    let container = document.querySelectorAll(".leaflet-zoom-animated")[1];
    let defs = L.SVG.create("defs");
    container.appendChild(defs);
    defs.insertAdjacentHTML(
      "beforeend",
      '<radialGradient id="gradient1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"> \
			<stop style="stop-color:#ff4d4d;stop-opacity:1;" offset="0" /> \
			<stop style="stop-color:#ff4d4d;stop-opacity:0;" offset="1" /> \
		</radialGradient>'
    );
  } catch (e) {
    console.log(e);
  }
});

class MapComponent extends Component {
  calculateMarkerSize = (zoom) => Math.cos((zoom * Math.PI) / 36) * -10 + 10;

  constructor(props) {
    super(props);

    this.constans = {
      lat: 50.0622881,
      lng: 19.9311482,
      radius: 1000000,
      initialZoom: 13,
    };

    this.state = {
      currentMarkerSize: this.calculateMarkerSize(this.constans.initialZoom),
      stationData: null,
      isGeolocalizationEnable: false,
      userCurrentPosition: {
        lat: 50.0622881,
        lng: 19.9311482,
      },
    };
  }

  static propTypes = {
    text: PropTypes.string,
  };

  componentDidMount() {
    this.trySetMapPositionWithGeolocation();
  }

  setMapPositionWithGeolocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          isGeolocalizationEnable: true,
          userCurrentPosition: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
      },
      (error) =>
        console.error("Error Code = " + error.code + " - " + error.message)
    );
  }

  trySetMapPositionWithGeolocation() {
    if (!("geolocation" in navigator)) {
      return false;
    }
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((info) => {
        if (info.state == "granted") {
          this.setMapPositionWithGeolocation();
        }
      });
    } else {
      // Safari doesn't support navigator.permissions
      this.setMapPositionWithGeolocation();
    }
    this.getMarkers();
  }

  getStationData(stationId) {
    let key = `station${stationId}Key`;
    fetch(
      getApiUrl("getPopupData", [stationId], {
        strategy: "latest",
      })
    )
      .then((response) => response.json())
      .then((data) => {
        console.log(data.data);
        this.setState({
          [key]: data.data,
        });
      })
      .catch((e) => console.error(e));
  }

  getMarkers() {
    fetch(
      getApiUrl("getMarkers", null, {
        latitude: this.constans.lat,
        longitude: this.constans.lng,
        radius: this.constans.radius,
      })
    )
      .then((response) => response.json())
      .then((data) => {
        console.log(data.data);
        this.setState({
          stationData: data.data,
        });
      })
      .catch((e) => console.error(e));
  }

  renderMarkers(map) {
    if (!this.state.stationData) return;
    return this.state.stationData.map((item, index) => {
      let position = {
        lat: item.location.latitude,
        lng: item.location.longitude,
      };
      let stationId = item.id;
      let stationDataKey = `station${stationId}Key`;
      let color = AirQualityColors[indexToLevel(item.aqi)];
      let hiddenClass = "";
      return (
        <CircleMarker
          className={hiddenClass}
          key={index}
          center={position}
          fillColor={color}
          color={color}
          onClick={() => this.getStationData(stationId)}
          fillOpacity={0.3}
          opacity={1}
          radius={this.state.currentMarkerSize}
        >
          <AnimatedMapPopup
            stationData={this.state[stationDataKey]}
            color={color}
            onOpen={() => (hiddenClass = styles.hiddenMarker)}
          />
        </CircleMarker>
      );
    });
  }

  currentPositionMarker() {
    if (!this.state.isGeolocalizationEnable) return;
    return (
      <CircleMarker
        center={this.state.userCurrentPosition}
        fillColor="#5078de"
        color="#5078de"
        onClick={() => {}}
      ></CircleMarker>
    );
  }

  render() {
    const position = [this.constans.lat, this.constans.lng];

    return (
      <div className="mapContainer">
        <Map
          zoomControl={false}
          center={position}
          zoom={this.constans.initialZoom}
          ref={(m) => {
            this.leafletMap = m;
          }}
          onzoomend={(x) =>
            this.setState({
              currentMarkerSize: this.calculateMarkerSize(
                this.leafletMap.leafletElement.getZoom()
              ),
            })
          }
          className="map"
        >
          <TileLayer
            attribution='<a href="//basemaps.cartocdn.com">Basemap</a> | &copy; <a href="//osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {this.renderMarkers(this.leafletMap)}
          {this.currentPositionMarker()}
        </Map>
        <div className="airellaLogo">Airella</div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state.search;
}

export default connect(mapStateToProps)(MapComponent);
