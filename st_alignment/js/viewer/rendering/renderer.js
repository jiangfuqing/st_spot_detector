'use strict';

(function() {
  
    var self;
    var Renderer = function(context, camera) {
        self = this;
        self.ctx = context;
        self.camera = camera;
        self.bgColour = 'khaki';
        self.spotColour = 'red';
        self.selectedSpotColour = 'green';
        self.spotMiddleColour = 'black';
    };
  
    Renderer.prototype = {
        clearCanvas: function() {
            self.ctx.fillStyle = self.bgColour;
            self.ctx.fillRect(0, 0, self.ctx.canvas.width, self.ctx.canvas.height);
        },
        renderStartScreen: function() {
            self.ctx.font = "48px serif";
            self.ctx.fillStyle = 'black';
            self.ctx.fillText("Click on Upload to upload and process an image", 10, 50);
        },
        renderImages: function(images) {
            self.camera.begin();
                for(var i = 0; i < images.length; ++i) {
                    self.ctx.drawImage(images[i], images[i].renderPosition.x, images[i].renderPosition.y, images[i].scaledSize.x, images[i].scaledSize.y);
                }
            self.camera.end();
        },
        renderSpots: function(spots) {
            self.camera.begin();
                for(var i = 0; i < spots.length; ++i) {
                    var spot = spots[i];

                    self.ctx.beginPath();
                    if(spot.selected) {
                        self.ctx.fillStyle = self.selectedSpotColour;
                    }
                    else {
                        self.ctx.fillStyle = self.spotColour;
                    }
                    self.ctx.arc(spot.renderPosition.x, spot.renderPosition.y, spot.size, 0, Math.PI * 2);
                    self.ctx.closePath();
                    self.ctx.fill();

                    self.ctx.beginPath();
                    self.ctx.fillStyle = self.spotMiddleColour;
                    self.ctx.arc(spot.renderPosition.x, spot.renderPosition.y, 4, 0, Math.PI * 2);
                    self.ctx.closePath();
                    self.ctx.fill();
                }
            self.camera.end();
        },
        renderSpotSelection: function(rectCoords) {
            self.ctx.strokeStyle = "rgba(30, 30, 30, 0.9)";
            self.ctx.setLineDash([4, 3]);
            self.ctx.strokeRect(rectCoords.TL.x, rectCoords.TL.y, rectCoords.WH.x, rectCoords.WH.y);
        }
  };

  this.Renderer = Renderer;
  
}).call(this);