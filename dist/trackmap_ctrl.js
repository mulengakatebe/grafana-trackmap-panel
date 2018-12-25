'use strict';

System.register(['./leaflet/leaflet.js', 'moment', 'app/core/core', 'app/plugins/sdk', './leaflet/leaflet.css!', './module.css!'], function (_export, _context) {
  "use strict";

  var L, moment, appEvents, MetricsPanelCtrl, _createClass, TrackMapCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_leafletLeafletJs) {
      L = _leafletLeafletJs.default;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_appCoreCore) {
      appEvents = _appCoreCore.appEvents;
    }, function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_leafletLeafletCss) {}, function (_moduleCss) {}],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('TrackMapCtrl', TrackMapCtrl = function (_MetricsPanelCtrl) {
        _inherits(TrackMapCtrl, _MetricsPanelCtrl);

        function TrackMapCtrl($scope, $injector) {
          _classCallCheck(this, TrackMapCtrl);

          var _this = _possibleConstructorReturn(this, (TrackMapCtrl.__proto__ || Object.getPrototypeOf(TrackMapCtrl)).call(this, $scope, $injector));

          _this.timeSrv = $injector.get('timeSrv');
          _this.coords = [];
          _this.leafMap = null;
          _this.polyline = null;
          _this.hoverMarker = null;
          _this.hoverTarget = null;

          // Plugin config
          _this.panel.maxDataPoints = 500;
          if (_this.panel.lineColor == null) {
            _this.panel.lineColor = 'red';
          }
          if (_this.panel.pointColor == null) {
            _this.panel.pointColor = 'royalblue';
          }

          // Panel events
          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('panel-teardown', _this.onPanelTeardown.bind(_this));
          _this.events.on('data-received', _this.onDataReceived.bind(_this));

          // Global events
          appEvents.on('graph-hover', _this.onPanelHover.bind(_this));
          appEvents.on('graph-hover-clear', _this.onPanelClear.bind(_this));
          return _this;
        }

        _createClass(TrackMapCtrl, [{
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/grafana-trackmap-panel/editor.html', 2);
          }
        }, {
          key: 'onPanelTeardown',
          value: function onPanelTeardown() {
            this.$timeout.cancel(this.nextTickPromise);
          }
        }, {
          key: 'onPanelHover',
          value: function onPanelHover(evt) {
            if (this.coords.length === 0) {
              return;
            }

            // check if we are already showing the correct hoverMarker
            var target = Math.floor(evt.pos.x);
            if (this.hoverTarget && this.hoverTarget === target) {
              return;
            }

            // check for initial show of the marker
            if (this.hoverTarget == null) {
              this.hoverMarker.bringToFront().setStyle({
                fillColor: this.panel.pointColor,
                color: 'white'
              });
            }

            this.hoverTarget = target;

            // Find the currently selected time and move the hoverMarker to it
            // Note that an exact match isn't always going to work due to rounding so
            // we clean that up later (still more efficient)
            var min = 0;
            var max = this.coords.length - 1;
            var idx = null;
            var exact = false;
            while (min <= max) {
              idx = Math.floor((max + min) / 2);
              if (this.coords[idx].timestamp === this.hoverTarget) {
                exact = true;
                break;
              } else if (this.coords[idx].timestamp < this.hoverTarget) {
                min = idx + 1;
              } else {
                max = idx - 1;
              }
            }

            // Correct the case where we are +1 index off
            if (!exact && idx > 0 && this.coords[idx].timestamp > this.hoverTarget) {
              idx--;
            }
            this.hoverMarker.setLatLng(this.coords[idx].position);
          }
        }, {
          key: 'onPanelClear',
          value: function onPanelClear(evt) {
            // clear the highlighted circle
            this.hoverTarget = null;
            if (this.hoverMarker) {
              this.hoverMarker.setStyle({
                fillColor: 'none',
                color: 'none'
              });
            }
          }
        }, {
          key: 'setupMap',
          value: function setupMap() {
            // Create the map or get it back in a clean state if it already exists
            if (this.leafMap) {
              if (this.polyline) {
                this.polyline.removeFrom(this.leafMap);
              }
              this.onPanelClear();
              return;
            }

            // Create the map
            this.leafMap = L.map('trackmap-' + this.panel.id, {
              scrollWheelZoom: false,
              zoomSnap: 0.5,
              zoomDelta: 1
            });

            // Define layers and add them to the control widget
            L.control.layers({
              'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
              }).addTo(this.leafMap), // Add default layer to map
              'OpenTopoMap': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
                maxZoom: 17
              }),
              'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Imagery &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                // This map doesn't have labels so we force a label-only layer on top of it
                forcedOverlay: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png', {
                  attribution: 'Labels by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                  subdomains: 'abcd',
                  maxZoom: 20
                })
              })
            }).addTo(this.leafMap);

            // Dummy hovermarker
            this.hoverMarker = L.circleMarker(L.latLng(0, 0), {
              color: 'none',
              fillColor: 'none',
              fillOpacity: 1,
              weight: 2,
              radius: 7
            }).addTo(this.leafMap);

            // Events
            this.leafMap.on('baselayerchange', this.mapBaseLayerChange.bind(this));
            this.leafMap.on('boxzoomend', this.mapZoomToBox.bind(this));
          }
        }, {
          key: 'mapBaseLayerChange',
          value: function mapBaseLayerChange(e) {
            // If a tileLayer has a 'forcedOverlay' attribute, always enable/disable it
            // along with the layer
            if (this.leafMap.forcedOverlay) {
              this.leafMap.forcedOverlay.removeFrom(this.leafMap);
              this.leafMap.forcedOverlay = null;
            }
            var overlay = e.layer.options.forcedOverlay;
            if (overlay) {
              overlay.addTo(this.leafMap);
              overlay.setZIndex(e.layer.options.zIndex + 1);
              this.leafMap.forcedOverlay = overlay;
            }
          }
        }, {
          key: 'mapZoomToBox',
          value: function mapZoomToBox(e) {
            // Find time bounds of selected coordinates
            var bounds = this.coords.reduce(function (t, c) {
              if (e.boxZoomBounds.contains(c.position)) {
                t.from = Math.min(t.from, c.timestamp);
                t.to = Math.max(t.to, c.timestamp);
              }
              return t;
            }, { from: Infinity, to: -Infinity });

            // Set the global time range
            if (isFinite(bounds.from) && isFinite(bounds.to)) {
              // KLUDGE: Create moment objects here to avoid a TypeError that
              // occurs when Grafana processes normal numbers
              this.timeSrv.setTime({
                from: moment.utc(bounds.from),
                to: moment.utc(bounds.to)
              });
            }
          }
        }, {
          key: 'addDataToMap',
          value: function addDataToMap() {
            this.polyline = L.polyline(this.coords.map(function (x) {
              return x.position;
            }, this), {
              color: this.panel.lineColor,
              weight: 3
            }).addTo(this.leafMap);

            this.leafMap.fitBounds(this.polyline.getBounds());
          }
        }, {
          key: 'refreshColors',
          value: function refreshColors() {
            if (this.polyline) {
              this.polyline.setStyle({
                color: this.panel.lineColor
              });
            }
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(data) {
            this.setupMap();

            if (data.length === 0 || data.length !== 2) {
              // No data or incorrect data, show a world map and abort
              this.leafMap.setView([0, 0], 1);
              return;
            }

            // Asumption is that there are an equal number of properly matched timestamps
            // TODO: proper joining by timestamp?
            this.coords.length = 0;
            var lats = data[0].datapoints;
            var lons = data[1].datapoints;
            for (var i = 0; i < lats.length; i++) {
              if (lats[i][0] == null || lons[i][0] == null || lats[i][1] !== lats[i][1]) {
                continue;
              }

              this.coords.push({
                position: L.latLng(lats[i][0], lons[i][0]),
                timestamp: lats[i][1]
              });
            }
            this.addDataToMap();
          }
        }]);

        return TrackMapCtrl;
      }(MetricsPanelCtrl));

      _export('TrackMapCtrl', TrackMapCtrl);

      TrackMapCtrl.templateUrl = 'module.html';
    }
  };
});
//# sourceMappingURL=trackmap_ctrl.js.map
