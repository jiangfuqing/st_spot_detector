'use strict';

angular.module('stSpots')
    .controller('MainController', [
        '$scope',
        '$http',
        '$sce',
        '$compile',
        function($scope, $http, $sce, $compile) {
            var addSpotsToastsDisplayed = false;

            // texts to display in the menu bar panel when clicking the help button
            const helpTexts = {
                state_start:        "Click on the top-most icon to select and upload a Cy3 fluorescence image.",
                state_upload:       "",
                state_predetection: "Adjust the lines to align on top of the outermost spot frame.\n"
                                  + "Click on DETECT SPOTS to begin spot detection.",
                state_detection:    "",
                state_adjustment:   "Left click or Ctrl+click to select spots. Hold in shift to add to a selection.\n"
                                  + "Right click to move selected spots or navigate the canvas.\n"
                                  + "Click DELETE SPOTS to delete selected spots.\n"
                                  + "Click ADD SPOTS to change to spot addition mode, then right click or Ctrl+click to add spots.\n"
                                  + "Click FINISH ADDING SPOTS to return to selection mode.\n",
                state_sel_inside:   "",
                state_error:        "An error occured. Please try again."
            };

            // texts to display underneath the spinner while loading
            const spinnerTexts = {
                state_start:        "",
                state_upload:       "Processing image. This may take a few minutes.",
                state_predetection: "",
                state_detection:    "Detecting spots. This may take a few minutes.",
                state_sel_inside:   "Running tissue recognition. This may take" +
                                    " a few minutes.",
                state_adjustment:    "",
                state_error:        ""
            };

            // texts to display as a title on the menu bar panel
            const panelTitles = {
                button_uploader: 'Uploader',
                button_detector: 'Detection Parameters',
                button_adjuster: 'Spot adjustment',
                button_exporter: 'Spot export',
                button_help: 'Help',
                button_info: 'Info'
            };

            // variables which hold more "global" important information, some shared between
            // other controllers/directives
            $scope.data = {
                state: 'state_start',
                button: 'button_uploader',
                sessionId: '',
                cy3Image: '',
                bfImage: '',
                cy3Tiles: null,
                bfTiles: null,
                cy3Active: null,
                errorText: ''
            };

            $scope.classes = {
                canvas: "grabbable"
            };

            $scope.exportForm = {
                selection: 'selection',
                coordinateType: 'array'
            };

            // bools which control the visibilty of various elements on the page
            $scope.visible = {
                menuBar: true,
                menuBarPanel: true,
                zoomBar: false,
                toggleBar: false,
                spinner: false,
                canvas: false,
                error: false,
                panel: {
                    button_uploader: true,
                    button_detector: false,
                    button_adjuster: false,
                    button_exporter: false,
                    button_help: false,
                    button_info: false
                },
                spotAdjuster: {
                    button_addSpots: true,
                    button_finishAddSpots: false,
                    button_deleteSpots: true,
                    div_insideTissue: false
                }
            };

            // strings which determine the clickable state of the menu bar buttons 
            $scope.menuButtonDisabled = {
                button_uploader: '',
                button_detector: 'false',
                button_adjuster: 'false',
                button_exporter: 'false',
                button_help: '',
                button_info: ''
            };

            var toggleMenuBarPanelVisibility = function(previousButton, thisButton) {
                // the panel is closed if the same button is pressed again
                // but stays open otherwise
                if(previousButton != thisButton) {
                    $scope.visible.menuBarPanel = true;
                }
                else {
                    $scope.visible.menuBarPanel = !$scope.visible.menuBarPanel;
                }
            };
            
            function displayToasts(toastTexts) {
                // triggers the chain of recursion
                chainToast(toastTexts, 0);
            }

            function chainToast(toastTexts, toastIndex) {
                // recursive function for displaying several toasts in a row
                // if last toast in list of toasts
                if(toastTexts.length == toastIndex) { 
                    // do nothing, end recursion
                }
                else {
                    toastr.options.onHidden = function() {
                        chainToast(toastTexts, toastIndex + 1);
                    };
                    toastr["info"](toastTexts[toastIndex]);
                }
            }

            $scope.addSpotsToasts = function() {
                if(!addSpotsToastsDisplayed) {
                    addSpotsToastsDisplayed = true;
                    toastr.options.timeOut = "10000";
                    var toasts = [
                        "Left click to add spots.",
                        "Right click or Ctrl+click to navigate the canvas.",
                        "Click FINISH ADDING SPOTS to return to selection mode."
                    ];
                    displayToasts(toasts);
                }
            };

            $scope.clickSpotColor = function(color, type) {
                
            };

            function toast() {
                if($scope.data.state === 'state_start') {
                }
                else if($scope.data.state === 'state_upload') {
                    toastr.clear();
                }
                else if($scope.data.state === 'state_predetection') {
                    toastr["info"](
                        "Adjust the lines to frame the spots, as shown:<br>" + 
                        "<img src='images/framealignment.png'/><br>" +
                        "Click DETECT SPOTS to begin automatic spot detection."
                    );
                }
                else if($scope.data.state === 'state_detection'
                    || $scope.data.state == 'state_sel_inside') {
                        toastr.clear();
                }
                else if($scope.data.state === 'state_adjustment') {
                    toastr.options.timeOut = "10000";
                    var toasts = [
                        "Detected spots are shown in red.",
                        "Left click to select spots.<br>Holding in Shift adds to the selection.",
                        "Right click or Ctrl+click to move selected spots or navigate the canvas.",
                        "Click DELETE SPOTS to deleted selected spots.<br>" + 
                        "Click ADD SPOTS to add additional spots."
                    ];
                    displayToasts(toasts);
                }
                else if($scope.data.state === 'state_error') {
                    toastr.clear();
                }
            }

            $scope.updateState = function(new_state, show_toast = true) {
                $scope.data.state = new_state;
                if($scope.data.state === 'state_start') {
                    // reinitialise things
                }
                else if($scope.data.state === 'state_upload') {
                    $scope.visible.menuBar = false;
                    $scope.visible.zoomBar = false;
                    $scope.visible.spinner = true;
                    $scope.visible.canvas = false;
                    $scope.visible.errorText = false;
                }
                else if($scope.data.state === 'state_predetection') {
                    $scope.visible.menuBar = true;
                    $scope.visible.zoomBar = true;
                    $scope.visible.spinner = false;
                    $scope.visible.canvas = true;
                    $scope.visible.errorText = false;

                    openPanel('button_detector');
                }
                else if($scope.data.state === 'state_detection'
                    || $scope.data.state == 'state_sel_inside') {
                        $scope.visible.menuBar = false;
                        $scope.visible.zoomBar = false;
                        $scope.visible.spinner = true;
                        $scope.visible.canvas = false;
                        $scope.visible.errorText = false;
                    }
                else if($scope.data.state === 'state_adjustment') {
                    $scope.visible.menuBar = true;
                    $scope.visible.zoomBar = true;
                    $scope.visible.spinner = false;
                    $scope.visible.canvas = true;
                    $scope.visible.errorText = false;

                    openPanel('button_exporter');
                    openPanel('button_adjuster');
                }
                else if($scope.data.state === 'state_error') {
                    $scope.visible.menuBar = true;
                    $scope.visible.zoomBar = false;
                    $scope.visible.spinner = false;
                    $scope.visible.canvas = false;
                    $scope.visible.errorText = true;
                }
                if($scope.data.bfTiles != null)
                    // Toggle bar should always have the same visibility as the
                    // zoom bar
                    $scope.visible.toggleBar = $scope.visible.zoomBar;
                else
                    $scope.visible.toggleBar = false;

                if(show_toast)
                    toast();
            };

            function openPanel(button) {
                // undisable the button
                $scope.menuButtonDisabled[button] = '';
                // click the button
                $scope.menuButtonClick(button);
            }

            $scope.zoomButtonClick = function(direction) {
                $scope.zoom(direction); // defined in the viewer directive
            };

            $scope.toggleButtonClick = function() {
                if($scope.data.cy3Active)
                    $scope.receiveTilemap($scope.data.bfTiles, false);
                else
                    $scope.receiveTilemap($scope.data.cy3Tiles, false);
                $scope.data.cy3Active ^= true;
            };

            $scope.menuButtonClick = function(button) {
                // switch off all the panel visibilities
                for(var panel in $scope.visible.panel) {
                    $scope.visible.panel[panel] = false;
                }
                // except for the one we just selected
                $scope.visible.panel[button] = true;
                toggleMenuBarPanelVisibility($scope.data.button, button);
                $scope.data.button = button;
            };

            $scope.detectSpots = function() {
                $scope.updateState('state_detection');

                var getSpotData = function() {
                    var successCallback = function(response) {
                        $scope.updateState('state_adjustment');
                        $scope.loadSpots(response.data); // defined in the viewer directive
                    };
                    var errorCallback = function(response) {
                        $scope.data.errorText = response.data;
                        console.error(response.data);
                        $scope.updateState('state_error');
                    };

                    // we want to send the calibration data to the server,
                    // so we retrieve it from the viewer directive
                    var calibrationData = $scope.getCalibrationData();
                    // append the session id to this data so the server knows
                    // who we are
                    calibrationData.session_id = $scope.data.sessionId;

                    var config = {
                        params: calibrationData
                    };
                    $http.get('../detect_spots', config)
                        .then(successCallback, errorCallback);
                };
                getSpotData();
            };

            $scope.selinsideTissue = function() {
                $scope.updateState('state_sel_inside');

                var successCallback = function(response) {
                    $scope.updateState('state_adjustment', false);
                    $scope.loadSpots(response.data)
                };
                var errorCallback = function(response) {
                    $scope.data.errorText = response.data;
                    console.error(response.data.spots);
                    $scope.updateState('state_error');
                };

                var data = $scope.getSpots();
                $http.post('../select_spots_inside', {
                    spots: data.spots,
                    spacer: data.spacer,
                    session_id: $scope.data.sessionId
                }).then(successCallback, errorCallback);
            };

            $scope.getPanelTitle = function(button) {
                return panelTitles[button];
            };

            $scope.getHelpTexts = function(state) {
                return helpTexts[state];
            };

            $scope.getSpinnerText = function(state) {
                return spinnerTexts[state];
            };

            $scope.getToggleText = function(state) {
                if(this.data.cy3Active)
                    return "HE";
                else return "Cy3";
            };

            $scope.uploadImage = function() {
                if($scope.data.cy3Image != '') {
                    $scope.updateState('state_upload');
                    var getTileData = function() {
                        var tileSuccessCallback = function(response) {
                            $scope.visible.spotAdjuster.div_insideTissue
                                = response.data.bf_tiles != null;

                            $scope.data.cy3Tiles = response.data.cy3_tiles;
                            $scope.data.bfTiles = response.data.bf_tiles;

                            $scope.receiveTilemap($scope.data.cy3Tiles); // defined in the viewer directive
                            $scope.data.cy3Active = true;

                            $scope.updateState('state_predetection');
                        };
                        var tileErrorCallback = function(response) {
                            $scope.data.errorText = response.data;
                            console.error(response.data);
                            $scope.updateState('state_error');
                        };

                        $http.post('../tiles', {
                            cy3_image: $scope.data.cy3Image,
                            bf_image: $scope.data.bfImage,
                            session_id: $scope.data.sessionId
                        }).then(tileSuccessCallback, tileErrorCallback);
                    };

                    var getSessionId = function() {
                        var sessionSuccessCallback = function(response) {
                            $scope.data.sessionId = response.data;
                            getTileData();
                        };
                        var sessionErrorCallback = function(response) {
                            $scope.data.errorText = response.data;
                            console.error(response.data);
                            $scope.updateState('state_error');
                        };
                        $http.get('../session_id')
                            .then(sessionSuccessCallback, sessionErrorCallback);
                    };
                    getSessionId();
                }
            };

            toastr.options = {
                "closeButton": false,
                "debug": false,
                "newestOnTop": true,
                "progressBar": false,
                "positionClass": "toast-top-center",
                "preventDuplicates": true,
                "onclick": null,
                "showDuration": "300",
                "hideDuration": "1000",
                "timeOut": "0",
                "extendedTimeOut": "10000",
                "showEasing": "swing",
                "hideEasing": "linear",
                "showMethod": "fadeIn",
                "hideMethod": "fadeOut"
            };
            toastr["info"]("Welcome to the Spatial Transcriptomics Spot Detection Tool. Begin by uploading a Cy3 fluorescence image.", "");
        }
    ]);
