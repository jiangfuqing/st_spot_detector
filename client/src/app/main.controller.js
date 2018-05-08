import _ from 'lodash';
import math from 'mathjs';

import imageToggleCy from 'assets/images/imageToggleCy3.png';
import imageToggleHE from 'assets/images/imageToggleHE.png';

import LayerManager from './viewer/layer-manager';
import { error, warning } from './modal';

import { LOAD_STAGE } from './loading-widget.directive';

function unwrapRequest(request) {
    return new Promise(
        (resolve, reject) => {
            request
                .then((response) => {
                    const success = response.data.success;
                    const warnings = response.data.warnings;
                    const result = response.data.result;
                    _.each(warnings, warning);
                    if (!success) {
                        reject(result);
                    } else {
                        resolve(result);
                    }
                })
                .catch((response) => {
                    const result = response.data;
                    reject(result);
                })
            ;
        },
    );
}

function tryState(scope, state, request) {
    const oldState = scope.data.state;
    scope.updateState(state);
    return new Promise(
        (resolve, reject) => {
            request.then(resolve).catch((result) => {
                scope.updateState(oldState);
                reject(result);
            });
        },
    );
}

const main = [
    '$scope',
    '$http',
    '$sce',
    '$compile',
    '$q',
    function($scope, $http, $sce, $compile, $q) {
        // texts to display in the menu bar panel when clicking the help button
        const helpTexts = {
            state_start:         "Click on the top-most icon to select and upload image(s). The image(s) must be in .jpg format and rotated so that the frame cluster appears at the top left of the image.",
            state_upload:        "",
            state_detection:     "",
            state_adjustment:    "Left click or Ctrl+click to select spots. Hold in shift to add to a selection.\n" +
            "Right click to move selected spots or navigate the canvas.\n" +
            "Click 'Delete spots' to delete selected spots.\n" +
            "Click 'Add spots' to change to spot addition mode, then right click or Ctrl+click to add spots.\n" +
            "(HE only) Click 'Select spots within tissue' to automatically select spots within the tissue.\n" +
            "Click 'Finish Adding Spots' to return to selection mode.\n",
            state_error:         "An error occured. Please try again."
        };

        // texts to display as a title on the menu bar panel
        const panelTitles = {
            button_uploader: 'Image upload',
            button_aligner: 'Image adjustment',
            button_adjuster: 'Spot adjustment',
            button_exporter: 'Data export',
            button_help: 'Help',
            button_settings: 'Settings',
        };

        // variables which hold more "global" important information, some shared between
        // other controllers/directives
        $scope.data = {
            state: '',
            logicHandler: null,
            button: 'button_uploader',
            sessionId: '',
            cy3Image: '',
            heImage: '',
            cy3Active: null,
            cy3Filename: '',
        };

        $scope.exportForm = {
            selection: 'selection',
            selectionFlag(v) {
                if (arguments.length) {
                    this.selectionFlagValue = v;
                    return v;
                }
                return this.selection === 'all' && this.selectionFlagValue;
            },
            selectionFlagValue: true,
        };

        // bools which control the visibilty of various elements on the page
        $scope.visible = {
            menuBar: Boolean(),
            menuBarPanel: Boolean(),
            zoomBar: Boolean(),
            imageToggleBar: Boolean(),
            loadingWidget: Boolean(),
            canvas: Boolean(),
            undo: {
                undo: Boolean(),
                redo: Boolean(),
            },
            panel: {
                button_uploader: Boolean(),
                button_aligner: Boolean(),
                button_adjuster: Boolean(),
                button_exporter: Boolean(),
                button_help: Boolean(),
                button_info: Boolean(),
                button_settings: Boolean(),
            },
            spotAdjuster: {
                button_addSpots: Boolean(),
                button_finishAddSpots: Boolean(),
                button_deleteSpots: Boolean(),
                div_insideTissue: Boolean(),
            },
        };

        // strings which determine the clickable state of the menu bar buttons 
        $scope.menuButtonDisabled = {
            button_uploader: Boolean(),
            button_aligner: Boolean(),
            button_adjuster: Boolean(),
            button_exporter: Boolean(),
            button_help: Boolean(),
            button_info: Boolean(),
        };

        $scope.layerManager = new LayerManager();

        function openPanel(button, state) {
            // undisable the button
            $scope.menuButtonDisabled[button] = false;
            // click the button
            $scope.menuButtonClick(button, state);
        }

        function init_state() {
            $scope.visible.menuBarPanel = false;
            $scope.visible.imageToggleBar = false;
            $scope.visible.undo.undo = true;
            $scope.visible.undo.redo = true;
            $scope.visible.panel.button_uploader = false;
            $scope.visible.panel.button_aligner = false;
            $scope.visible.panel.button_adjuster = false;
            $scope.visible.panel.button_exporter = false;
            $scope.visible.panel.button_help = false;
            $scope.visible.panel.button_info = false;
            $scope.visible.panel.button_settings = false;
            $scope.visible.spotAdjuster.button_addSpots = true;
            $scope.visible.spotAdjuster.button_finishAddSpots = false;
            $scope.visible.spotAdjuster.button_deleteSpots = true;
            $scope.visible.spotAdjuster.div_insideTissue = false;

            $scope.menuButtonDisabled.button_uploader = false;
            $scope.menuButtonDisabled.button_aligner = true;
            $scope.menuButtonDisabled.button_adjuster = true;
            $scope.menuButtonDisabled.button_exporter = true;
            $scope.menuButtonDisabled.button_help = false;
            $scope.menuButtonDisabled.button_info = false;

            openPanel('button_uploader', 'state_start');
        }

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

        function updateVisibility() {
            const setVisibility = (layer, value) => {
                if (layer in $scope.layerManager.getLayers()) {
                    $scope.layerManager.getLayer(layer).set('visible', value);
                }
            };
            if ($scope.data.state === 'state_alignment') {
                setVisibility('Cy3', true);
                setVisibility('HE', true);
            } else {
                setVisibility('Cy3', $scope.data.cy3Active);
                setVisibility('HE', !$scope.data.cy3Active);
            }
        }

        $scope.updateState = function(new_state) {
            const transformAnnotations = (tmat) => {
                const doTransform = _.flow(
                    xs => [[...xs, 1]],
                    math.transpose,
                    _.partial(math.multiply, tmat),
                    math.flatten,
                    /* eslint-disable no-underscore-dangle */
                    xs => xs._data,
                    _.partial(_.take, _, 2),
                );

                $scope.calibrator.points = _.map(
                    $scope.calibrator.points, doTransform);
                $scope.spotManager.spots = _.map(
                    $scope.spotManager.spots,
                    (s) => {
                        /* eslint-disable no-param-reassign */
                        [s.x, s.y] = doTransform([s.x, s.y]);
                        return s;
                    },
                );
            };

            if ($scope.data.state === 'state_alignment') {
                $scope.exitAlignment();
                transformAnnotations(
                    $scope.layerManager.getLayer('Cy3').tmat);
            }

            $scope.data.state = new_state;

            if($scope.data.state === 'state_start') {
                $scope.visible.menuBar = true;
                $scope.visible.zoomBar = false;
                $scope.visible.loadingWidget = false;
                $scope.visible.canvas = false;
            }
            else if($scope.data.state === 'state_upload') {
                $scope.visible.menuBar = false;
                $scope.visible.zoomBar = false;
                $scope.visible.loadingWidget = true;
                $scope.visible.canvas = false;
            }
            else if($scope.data.state === 'state_alignment') {
                $scope.visible.menuBar = true;
                $scope.visible.zoomBar = true;
                $scope.visible.loadingWidget = false;
                $scope.visible.canvas = true;
                $scope.visible.imageToggleBar = false;

                transformAnnotations(math.inv(
                    $scope.layerManager.getLayer('Cy3').tmat));
                $scope.initAlignment();

                $scope.data.logicHandler = $scope.alignerLH;
            }
            else if($scope.data.state === 'state_detection') {
                $scope.visible.menuBar = false;
                $scope.visible.zoomBar = false;
                $scope.visible.loadingWidget = true;
                $scope.visible.canvas = false;
            }
            else if($scope.data.state === 'state_adjustment') {
                $scope.visible.menuBar = true;
                $scope.visible.zoomBar = true;
                $scope.visible.loadingWidget = false;
                $scope.visible.canvas = true;

                $scope.data.logicHandler = $scope.adjustmentLH;
            }

            if ('HE' in $scope.layerManager.getLayers() && new_state !== 'state_alignment') {
                // toggle bar should have the same visibility as the zoom bar if HE tiles
                // uploaded and we're not in the alignment view
                $scope.visible.imageToggleBar = $scope.visible.zoomBar;
            } else {
                $scope.visible.imageToggleBar = false;
            }

            updateVisibility();
        };

        $scope.undoButtonClick = function(direction) {
            $scope.undo(direction); // defined in the viewer directive
        };

        $scope.zoomButtonClick = function(direction) {
            $scope.zoom(direction); // defined in the viewer directive
        };

        $scope.imageToggleButtonClick = function() {
            $scope.data.cy3Active = !$scope.data.cy3Active;
            updateVisibility();
        };

        $scope.menuButtonClick = function(button, state) {
            // only clickable if not disabled
            if (!$scope.menuButtonDisabled[button]) {
                // switch off all the panel visibilities
                for(var panel in $scope.visible.panel) {
                    $scope.visible.panel[panel] = false;
                }
                // except for the one we just selected
                $scope.visible.panel[button] = true;
                toggleMenuBarPanelVisibility($scope.data.button, button);
                $scope.data.button = button;

                if (state !== undefined) {
                    $scope.updateState(state);
                }
            }
        };

        $scope.getPanelTitle = function(button) {
            return panelTitles[button];
        };

        $scope.getHelpTexts = function(state) {
            return helpTexts[state];
        };

        $scope.getImageToggleImage = function() {
            if ($scope.data.cy3Active) {
                return imageToggleHE;
            }
            return imageToggleCy;
        };

        $scope.getImageToggleText = function() {
            if ($scope.data.cy3Active) {
                return 'HE';
            }
            return 'Cy3';
        };

        $scope.uploadImage = function() {
            if($scope.data.cy3Image != '') {
                init_state();

                let loadingState = $scope.initLoading();

                $q.when(tryState(
                    $scope,
                    'state_upload',
                    unwrapRequest($http({
                        method: 'POST',
                        url: '../run',
                        uploadEventHandlers: {
                            progress(e) {
                                loadingState = $scope.updateLoading(
                                    loadingState,
                                    {
                                        stage: LOAD_STAGE.UPLOAD,
                                        loaded: e.loaded,
                                        total: e.total,
                                    },
                                );
                            },
                            load() {
                                loadingState = $scope.updateLoading(
                                    loadingState,
                                    { stage: LOAD_STAGE.WAIT },
                                );
                            },
                        },
                        eventHandlers: {
                            progress(e) {
                                loadingState = $scope.updateLoading(
                                    loadingState,
                                    {
                                        stage: LOAD_STAGE.DOWNLOAD,
                                        loaded: e.loaded,
                                        total: e.total,
                                    },
                                );
                            },
                        },
                        data: {
                            cy3_image: $scope.data.cy3Image,
                            he_image: $scope.data.heImage,
                            array_size: [
                                $scope.calibrator.width,
                                $scope.calibrator.height,
                            ],
                        },
                    })).then((result) => {
                        $scope.receiveTilemap(result.tiles);
                        $scope.loadSpots(result.spots, result.tissue_mask);
                        $scope.data.spotTransformMatrx = result.spots.transform_matrix;
                        $scope.data.cy3Active = true;
                        $scope.menuButtonDisabled.button_exporter = false;
                        if ('HE' in result.tiles) {
                            $scope.visible.spotAdjuster.div_insideTissue = true;
                            $scope.menuButtonDisabled.button_adjuster = false;
                            openPanel('button_aligner', 'state_alignment');
                        } else {
                            $scope.menuButtonDisabled.button_aligner = false;
                            openPanel('button_adjuster', 'state_adjustment');
                        }
                    }),
                )).catch(
                    error,
                ).finally(() => {
                    $scope.exitLoading(loadingState);
                });
            }
        };

        init_state();
    }
];

export default main;
