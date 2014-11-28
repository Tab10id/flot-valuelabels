/**
* Value Labels Plugin for flot.
* https://github.com/winne27/flot-valuelabels
* https://github.com/winne27/flot-valuelabels/wiki
*
* Implemented some new options (useDecimalComma, showMinValue, showMaxValue)
* changed some default values: align now defaults to center, hideSame now defaults to false
* by Werner Schäffer, October 2014
*
* Using canvas.fillText instead of divs, which is better for printing - by Leonardo Eloy, March 2010.
* Tested with Flot 0.6 and JQuery 1.3.2.
*
* Original homepage: http://sites.google.com/site/petrsstuff/projects/flotvallab
* Released under the MIT license by Petr Blahos, December 2009.
*/
(function ($) {
  var options = {
    series: {
      valueLabels: {
        show: false,
        showMaxValue: false,
        showMinValue: false,
        showAsHtml: false, // Set to true if you wanna switch back to DIV usage (you need plot.css for this)
        showLastValue: false, // Use this to show the label only for the last value in the series
        labelFormatter: function(v) {
          return v;
        }, // Format the label value to what you want
        align: 'center', // can also be 'center', 'left' or 'right'
        valign: 'top', // can also be 'below', 'middle' or 'bottom'
        useDecimalComma: false,
        plotAxis: 'y', // Set to the axis values you wish to plot
        decimals: false,
        hideZero: false,
        hideSame: false, // Hide consecutive labels of the same value
        fontColor: '#666666',
        xOffset: 0,
        yOffset: 0,
        xOffsetP: 0,
        yOffsetP: 0,
        xOffsetMin: 0,
        yOffsetMin: 0,
        xOffsetMax: 0,
        yOffsetMax: 0,
        xOffsetLast: 0,
        yOffsetLast: 0,
        valignLast: 'top',
        valignMin: 'top',
        valignMax: 'top'
      }
    }
  };

  function init(plot) {
    plot.hooks.draw.push(function (plot, ctx) {
      // keep a running total between series for stacked bars.
      var stacked = {};

      $.each(plot.getData(), function(ii, series) {
        if (!series.valueLabels.show) return;
        var showLastValue = series.valueLabels.showLastValue;
        var showAsHtml = series.valueLabels.showAsHtml;
        var showMaxValue = series.valueLabels.showMaxValue;
        var showMinValue = series.valueLabels.showMinValue;
        var plotAxis = series.valueLabels.plotAxis;
        var labelFormatter = series.valueLabels.labelFormatter;
        var fontColor = series.valueLabels.fontColor;
        var xOffset = series.valueLabels.xOffset || 0;
        var yOffset = series.valueLabels.yOffset || 0;
        var xOffsetP = series.valueLabels.xOffsetP;
        var yOffsetP = series.valueLabels.yOffsetP;
        var xOffsetMin = series.valueLabels.xOffsetMin || xOffset;
        var yOffsetMin = series.valueLabels.yOffsetMin || yOffset;
        var xOffsetMax = series.valueLabels.xOffsetMax || xOffset;
        var yOffsetMax = series.valueLabels.yOffsetMax || yOffset;
        var xOffsetLast = series.valueLabels.xOffsetLast || xOffset;
        var yOffsetLast = series.valueLabels.yOffsetLast || yOffset;
        var align = series.valueLabels.align;
        var valign = series.valueLabels.valign;
        var valignLast = series.valueLabels.valignLast || valign;
        var valignMin = series.valueLabels.valignMin || valign;
        var valignMax = series.valueLabels.valignMax || valign;
        var font = series.valueLabels.font;
        var hideZero = series.valueLabels.hideZero;
        var hideSame = series.valueLabels.hideSame;
        var useDecimalComma = series.valueLabels.useDecimalComma;
        var stackedBar = series.stack;
        var decimals = series.valueLabels.decimals;
        // Workaround, since Flot doesn't set this value anymore
        series.seriesIndex = ii;
        if (showAsHtml) {
          plot.getPlaceholder().find("#valueLabels"+ii).remove();
        }
        var html = '<div id="valueLabels' + series.seriesIndex + '" class="valueLabels">';
        var lastVal = null;
        var lastX = -1000;
        var lastY = -1000;
        var categories = series.xaxis.options.mode == 'categories';

        if ((showMinValue || showMaxValue) && typeof(series.data[0]) != 'undefined') {
          var xMin = +series.data[0][0];
          var xMax = +series.data[0][0];
          var yMin = +series.data[0][1];
          var yMax = +series.data[0][1];
          for (var i = 1; i < series.data.length; ++i) {
            if (+series.data[i][0] < xMin) xMin = +series.data[i][0];
            if (+series.data[i][0] > xMax) xMax = +series.data[i][0];
            if (+series.data[i][1] < yMin) yMin = +series.data[i][1];
            if (+series.data[i][1] > yMax) yMax = +series.data[i][1];
          }
        }
        else {
          showMinValue = false;
          showMaxValue = false;
        }

        var notShowAll = showMinValue || showMaxValue || showLastValue;
        for (var i = 0; i < series.data.length; ++i) {
          if (series.data[i] === null) continue;
          var x = series.data[i][0], y = series.data[i][1];

          var xDelta;
          var yDelta;
          var valignWork;

          if (notShowAll) {
            var doWork = false;
            if (showMinValue && ((yMin == y && plotAxis == 'y') || (xMin == x && plotAxis == 'x'))) {
              doWork = true;
              xDelta = xOffsetMin;
              yDelta = yOffsetMin;
              valignWork = valignMin;
              showMinValue = false;
            }
            else if (showMaxValue && ((yMax == y && plotAxis == 'y') || (xMax == x && plotAxis == 'x'))) {
              doWork = true;
              xDelta = xOffsetMax;
              yDelta = yOffsetMax;
              valignWork = valignMax;
              showMaxValue = false;
            }
            else if (showLastValue && i == series.data.length-1) {
              doWork = true;
              xDelta = xOffsetLast;
              yDelta = yOffsetLast;
              valignWork = valignLast;
            }
            if (!doWork) continue;
          }
          else {
            xDelta = xOffset;
            yDelta = yOffset;
            valignWork = valign;
          }
          if (categories) {
            x = series.xaxis.categories[x];
          }
          if (x < series.xaxis.min || x > series.xaxis.max || y < series.yaxis.min || y > series.yaxis.max) continue;
          var val = (plotAxis === 'x')? x: y;
          if(val == null) {
            val = ''
          }
          if (val === 0 && (hideZero || stackedBar)) continue;

          if (decimals !== false) {
            var mult = Math.pow(10, decimals);
            val = Math.round(val * mult) / mult;
          }

          if (series.valueLabels.valueLabelFunc) {
            val = series.valueLabels.valueLabelFunc(
                {
                  series: series,
                  seriesIndex: ii,
                  index: i
                }
            );
          }
          val = "" + val;
          val = labelFormatter(val);
          if (useDecimalComma) {
            val = val.toString().replace('.', ',');
          }
          if (!hideSame || val != lastVal || i == series.data.length - 1) {
            var plotY = y;
            if (valignWork == 'bottom') {
               plotY = 0;
            }
            else if (valignWork == 'middle') {
               plotY = plotY / 2;
               yDelta = 11 + yDelta;
            }
            else if (valignWork == 'below') {
               yDelta = 20 + yDelta;
            }

            // add up y axis for stacked series
            var addstack = 0;
            if (stackedBar) {
               if (!stacked[x]) stacked[x] = 0.0;
               addstack = stacked[x];
               stacked[x] = stacked[x] + y;
            }

            var xx = series.xaxis.p2c(x) + plot.getPlotOffset().left;
            var yy = series.yaxis.p2c(+plotY + addstack) - 12 + plot.getPlotOffset().top;
            if (!hideSame || Math.abs(yy - lastY) > 20 || lastX < xx) {
              lastVal = val;
              lastX = xx + val.length * 8;
              lastY = yy;
              if (!showAsHtml) {
                // Little 5 px padding here helps the number to get
                // closer to points
                var xPos = xx + xDelta + (series.xaxis.p2c(x+1) - series.xaxis.p2c(x)) * xOffsetP;
                var yPos = yy + 6 + yDelta + (series.yaxis.p2c(y+1) - series.yaxis.p2c(y)) * yOffsetP;
                var actAlign;
                // If the value is on the top of the canvas, we need
                // to push it down a little
                if (yy <= 0) yPos = 18;
                // The same happens with the x axis
                if (xx >= plot.width() + plot.getPlotOffset().left) {
                  xPos = plot.width() + plot.getPlotOffset().left + xDelta - 3;
                  actAlign = 'right';
                }
                else {
                  actAlign = align;
                }
                if (font) {
                  ctx.font = font;
                }
                if(typeof(fontColor) != 'undefined') {
                  ctx.fillStyle = fontColor;
                }
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 1.5;
                if(typeof(fontColor) != 'undefined') {
                  ctx.shadowColor = fontColor;
                }
                ctx.textAlign = actAlign;
                ctx.fillText(val, xPos, yPos);
              }
              else {
                //allow same offsets for html rendering
                xx = xx + xOffset;
                yy = yy + 6 + yOffset;

                var head = '<div style="left:' + xx + 'px;top:' + yy + 'px;" class="valueLabel';
                var tail = '">' + val + '</div>';
                html += head + "Light" + tail + head + tail;
              }
            }
          }
        }
        if (showAsHtml) {
          html += "</div>";
          plot.getPlaceholder().append(html);
        }
      });
    });
  }
  $.plot.plugins.push(
      {
        init: init,
        options: options,
        name: 'valueLabels',
        version: '1.5.0'
      }
  );
}
)(jQuery);
