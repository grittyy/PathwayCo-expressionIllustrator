/*jshint camelcase: false*/



(function(window, $, d3,undefined) {
	'use strict';
	//var appContext = $('[data-app-name="workshop-tutorial-app"]');	
	
	var Dendrogram = function(){
        var LineWidth = 4;
        var font = '6pt Arial, sans-serif';
    
        var xticks = false;
        var yticks = true;
        var ytickN = 10;
    
        var skipped = d3.set();
        var skippedInfo = {};
    
        var width,height;
        var ctx;
        var dendrogram = this;
        var container = null;
        var clusterMidpointX,clusterMidpointH;
    
        var maxDeep,floor,ceil,wallL,wallR,groupGap,newGroups,orientation,max,maxRight,leftGroup,rightGroup,
        leftMidPointX,lowerLeftH,rightMidPointX,lowerRightH;
        
        this.metric = 'euclidean';
        this.method = 'average';
        this.orientation = 'left'; // 'top', 'left', 'right', 'bottom'
        
    
        this.x = [];
        this.labels = [];
        this.newGroups = [];
    
        this.init = init;
        this.draw = draw;
    
        // initialize
        function init(container_,width_,height_){
            container = container_;
            width = width_;
            height = height_;
            this.newGroups = [];
            if (typeof(ctx) !== 'undefined') ctx.clearRect(0,0,width,height);
        }
        
        function draw() {
            var linkage = new Linkage(this.x, this.metric, this.method);
            this.D = linkage.D;
            var links = linkage.L;
                
            // find the canvas or create it
            var canvas = container.select('canvas');
            if (canvas.empty()){
                canvas = container.append('canvas')
                    .attr('width',width)
                    .attr('height',height);
            }
            ctx = canvas.node().getContext('2d');
    
            // before draw, save ctx
            ctx.save();
    
            // save the midpoint of each cluster; instead of nextMidPoint
            clusterMidpointX = [];
            clusterMidpointH = [];
                
            // configure the canvas, rotate the canvas if necessary
            if (this.orientation == 'left'){
                maxDeep = width;
                floor = width;
                ceil = 5;
                wallR = height;
                wallL = 0;
                
                ctx.translate(width, 0);
                ctx.rotate(Math.PI/2);
            }else if (this.orientation == 'top'){
                maxDeep = height;
                floor = height;
                ceil = 5;
                wallL = 0;
                wallR = width;
            }else if (this.orientation == 'right'){
                maxDeep = width;
                floor = 0;
                ceil = width-5;
                wallR = height;
                wallL = 0;
                
                ctx.translate(width, 0);
                ctx.rotate(Math.PI/2);
            }else if (this.orientation == 'bottom'){
                maxDeep = height;
                floor = 0;
                ceil = height-5;
                wallL = 0;
                wallR = width;
            }
            
            // divide the canvas in group+1 fragments
            // how many groups? what space will be required?
            groupGap = (wallR-wallL)/(links.length+1);
            maxRight = wallL - groupGap*0.5;
    
            max = d3.max(links.map(function(l){ return l.min; }));
            
            // always draw the first cluster (group links.length)
            var cluster = links.length+1;
            drawCluster(links[0], cluster);
            var previouslyDrawn = cluster; 
    
            for (var i=1; i<links.length; i++) {
                cluster++;  
                leftGroup = links[i].row;
                rightGroup = links[i].col;
                // links[i] is link between two groups; of course, each groups must have already been built; if not, build it 
                // the groups are defined by their position on l, that is how they were grown
                // first ask: does this cluster link to the previous cluster?
                
                if (rightGroup === previouslyDrawn || leftGroup === previouslyDrawn){
                    if (leftGroup === previouslyDrawn){
                        // what about leftGroup? Does it exist?
                        // drawleft of right group first? which one has the shortest distance?
                        if (skipped.has(rightGroup))
                            drawSkipped(rightGroup);
                    }else{
                        // can if be drawn now?
                        if (skipped.has(leftGroup))
                            drawSkipped(leftGroup);
                    }
                    drawCluster(links[i], cluster); 
                    previouslyDrawn = cluster;
                }else{
                    // save this, they will be drawn later
                    skipped.add(cluster);  
                    skippedInfo[cluster] = links[i];
                }
            }
    
            drawAxes();
    
            // restore ctx after drawing
            ctx.restore();
        }
        
        function drawCluster(link, cluster) {
            // link is a row from the variable returned by linkage; 
            // cluster is the cluster number in linkage cols 1 and 2; i the ith row of cl
            // height will need to be subtracted from max deepness
            
            // scale the height using max
            var scaled_height = link.min*(floor-ceil)/max;
            
            ctx.beginPath();
            ctx.strokeStyle = "steelblue";
            ctx.lineWidth = LineWidth;
    
            // start in the middle of the fragment for each group; 
            // point 1 is [x,y] from the left, point 2 from the right; point 3 ends line started at point1 and point4 at point2
            // for point 1 and 4 the the line will be shortenned to be placed on top of the group that it is connecting to.
            if (typeof(clusterMidpointX[link.col]) !== 'undefined'){
                leftMidPointX = clusterMidpointX[link.col];
                lowerLeftH = clusterMidpointH[link.col];    
            }else{
                leftMidPointX = maxRight + groupGap;
                lowerLeftH = floor;
                maxRight = leftMidPointX;
            }
            
            if (typeof(clusterMidpointX[link.row]) !== 'undefined'){
                rightMidPointX = clusterMidpointX[link.row];
                lowerRightH = clusterMidpointH[link.row];
            }else{
                rightMidPointX = maxRight + groupGap;
                lowerRightH = floor;
                maxRight = rightMidPointX;
            }
            
            var point1 = [leftMidPointX, lowerLeftH];
            var point2 = [leftMidPointX, floor-scaled_height];
            var point3 = [rightMidPointX, floor-scaled_height];
            var point4 = [rightMidPointX, lowerRightH];
            
            // now draw
            ctx.moveTo(point1[0], point1[1]);
            ctx.lineTo(point2[0], point2[1]);
            ctx.lineTo(point3[0], point3[1]);
            ctx.lineTo(point4[0], point4[1]);
            ctx.stroke();
            
            // on the y axis, make a tick with the label of this h
            ctx.font = font;
            ctx.strokeStyle = "rgb(0,0,0)";
            
            function addLabel(group, point){
                // where the cluster is NOT defined yet, add a label
                if (typeof(clusterMidpointX[group]) === 'undefined'){
                    if (typeof(dendrogram.labels[group]) === 'undefined')
                        dendrogram.labels[group] = group;
    
                    var label = dendrogram.labels[group];
                    
                    if (xticks)
                        ctx.fillText(label, point[0]-ctx.measureText(label).width/2, maxDeep);
                }
                if (typeof(label) !== 'undefined') dendrogram.newGroups.push(group);
            }
    
            // now create the labels below the x axis; 
            // only the labels in input groups should be new; other groups are clusters
            addLabel(link.row, point3);
            addLabel(link.col, point1);
    
            // save the height and midpoint location of the group newly formed
            clusterMidpointX[cluster] = point2[0]+(point3[0]-point2[0])/2;
            clusterMidpointH[cluster] = floor-scaled_height;
        }
        
        function drawSkipped(skippedGroup) {
            var link = skippedInfo[skippedGroup];
            var skippedLeft = link.row;
            var skippedRight = link.col;
            
            if (skipped.has(skippedLeft) || skipped.has(skippedRight)){
                // how to decide which to draw first if they are both not drawn? which on is the shortest?
                if (skipped.has(skippedRight) && skipped.has(skippedLeft)){
                    if (skippedInfo[skippedRight].min >= skippedInfo[skippedLeft].min){
                        // if right is bigger, draw left first
                        drawSkipped(skippedLeft);
                        drawSkipped(skippedRight);
                    }else{
                        drawSkipped(skippedRight);
                        drawSkipped(skippedLeft);
                    }
                }else if (skipped.has(skippedRight)){
                    drawSkipped(skippedRight);
                }else{
                    drawSkipped(skippedLeft);
                }
                drawCluster(link, skippedGroup);
            }else{
                drawCluster(link, skippedGroup); 
            }
        }
        
        // the left and bottom will be used for the axis values
        function drawAxes() {
            if (yticks){
                // divide max in 10 bits
                var ticksDiv = max / ytickN;
                for (var i=0; i<ytickN; i++) {
                    // scale to the appropriate position
                    var value = ticksDiv*i;
                    var height = value*(floor-ceil)/max;
                    ctx.beginPath();
                    ctx.lineWidth = 1;
                    if (dendrogram.orientation == 'top' || dendrogram.orientation == 'left'){
                        ctx.moveTo(0, maxDeep-height);
                        ctx.lineTo(5, maxDeep-height);
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(d3.round(value,2), 5, maxDeep-height);
                    }else{
                        ctx.moveTo(0, -height);
                        ctx.lineTo(5, -height);
                        ctx.textBaseline = 'top';
                        ctx.fillText(d3.round(value,2), 5, -height);
                    }
                    ctx.stroke();
                }
            }
        }
    };
	
	var Linkage = function(matrix, metric, method){
    
        // distance matrix
        this.D = squareform(pdist(matrix,metric));
        this.L = linkage(this.D, method);
    
        function findLinkage(matrix) {
            var row, col;
            var min = d3.min(matrix.map(function(x,i){ return d3.min(x.slice(i+1)); }));
            var max = d3.max(matrix.map(function(x,i){ return d3.max(x.slice(i+1)); }));
            for (var i=0; i<matrix.length; i++) {
                var slice = matrix[i].slice(i+1);
                if (slice.indexOf(min) > -1){
                    row = i;
                    col = slice.indexOf(min) + (i+1);
                }
            }
            return { row:row, col:col, min:min, max:max };
        }
    
        function linkage(distMat, method) {
            // find the distance between groups using the metric indicated in method
            // x is the vector returned by pdist
            // supported methods: average (UPGMA), single, complete, 
            if (typeof(method) === 'undefined') method = 'average';
    
            // to copy matrix without changing square because slice works with a single array
            var matrix = distMat.slice(0);
            var rejected = d3.set();
            
            // every group has its own index as the value in group, except for the new groups
            var group = d3.range(matrix.length).map(function(i){ return [i]; });
    
            var func = {
                'average' : function(x){ return d3.sum(x)/x.length; },
                'single' : function(x){ return d3.min(x); },
                'complete' : function(x){ return d3.max(x); },
            };
            
            var links = d3.range(distMat.length-1).map(function(i){
                // find the absolute minima in the matrix;
                var link = findLinkage(matrix);
                
                // save the rejected indexes in all cases
                var reject = [link.row, link.col];
                reject.map(function(x){ rejected.add(x); });
                        
                // to build the next matrix, copy the group matrix; 
                matrix = matrix.map(function(x){ return x.slice(0); });  
                
                // replace the row/col in rejected indexes with max+1; equivalent to deleting these lines/cols because they will not return a min
                reject.map(function(i){
                    for (var j=0; j<matrix[i].length; j++)
                        matrix[i][j] = matrix[j][i] = link.max+1;
                });
                
                // now calculate the distance from group rc to the remaining lines/cols
                var next = matrix.length;
                matrix.push(new Array());
    
                // group indexes will not only reflect the line, because that is erroneous since the line grows;
                // it must reflect all the indexes that each line is made up of
                group.push(d3.merge([group[link.row], group[link.col]]));
    
                // now apply the method to obtain the new lines; if next group (group+1) == group before last (groupSize-1),
                // then there will not be any data and the min will be calculated by averaging the distance to all other original groups included in the cluster 
                for (var j=0; j<matrix.length; j++) {
                    if (rejected.has(j)){
                        matrix[next][j] = matrix[j][next] = link.max+1;
                    }else{
                        var vec = d3.merge(group[next].map(function(g){
                            return group[j].map(function(h){ return distMat[g][h]; })}));
                        matrix[next][j] = matrix[j][next] = func[method](vec);
                    }
                }
                return link;
            });
            return links;
        }
    
        function corr(x,y,method) {
            // calculate Pearson correlation, method defined in method
            if (typeof(method) === 'undefined') method = 'Pearson';
            
            // x and y should have the same length
            console.assert(x.length == y.length, 'x and y lengths don\'t match :-(');
    
            function sub(x,d){ return x.map(function(x){ return x-d; }); }
            function dot(x,y){ return d3.sum(d3.zip(x,y).map(function(x){ return x[0]*x[1]; })); }
            function norm2(x){ return Math.sqrt(dot(x,x)); }
            function mean(x){ return d3.sum(x)/x.length; }
    
            function sd(x){ return norm2(sub(x, mean(x))); }
            function cov(x,y) { return dot(sub(x, mean(x)), sub(y, mean(y))); }
    
            var func = {
                // TODO (Kendall, Tau)
                'Pearson': function(x,y){ return cov(x,y) / (sd(x)*sd(y)); }
            };
    
            return func[method](x,y);
        }
    
        function pdist(x,method,p) {
            // x is a matrix, method can be euclidean, city block, minkowsi or correlation
            if (typeof(method) === 'undefined') method = 'euclidean';
            if (method === 'minkowski' && typeof(p) === 'undefined') p = 2;
    
            // make sure there are more than 2 rows
            console.assert(x.length > 1, 'can\'t calculate pairwise distance between less than 2 points :-(');
    
            function sub(x,y){ return d3.zip(x,y).map(function(x){ return x[0]-x[1]; }); }
            function pow(x,d){ return x.map(function(x){ return Math.pow(x,d); }); }
            function abs(x){ return x.map(function(x){ return Math.abs(x); }); }
    
            var func = {
                'euclidean': function(x,y,p){ return Math.sqrt(d3.sum(pow(sub(x, y), 2))); }, 
                'minkowski': function(x,y,p){ return Math.pow(d3.sum(pow(abs(sub(x, y)), p)), 1/p); }, 
                'city block': function(x,y,p){ return d3.sum(abs(sub(x, y))); }, 
                'correlation': function(x,y,p){ return (1-corr(x,y)); }, 
            };
    
            var pdist = [];
            for (var i=0; i<x.length; i++) {
                // start at row 0, compare with row 1, row 2 and so on; them go to row 1, compare with row 2, row 3 and so on;
                // the next look always starts at i+1 even though it goes only to the point of x.lengh
                for (var j=i+1; j<x.length; j++) {
                    //calculate the difference between each col of two consecutive rows
                    console.assert(x[i].length == x[j].length, 'row '+i+' and '+j+' do not have the same length !');
                    pdist.push(func[method](x[i],x[j],p));
                }
            }
            return pdist;
        }
    
        function squareform(x) {
            // x is a vector returned from pdist, to build a distance matrix (symmetric, diagonal = 0);
            
            var dim = Math.ceil(Math.sqrt(x.length*2));
            function zeros(x){ return d3.range(x).map(function(){ return 0; }); }
            var square = d3.range(dim).map(function(x){ return zeros(dim); });
            var k = 0;
    
            for (var i=0; i<dim; i++)
                for (var j=i+1; j<dim; j++)
                    square[i][j] = square[j][i] = x[k++];
            return square;
        }
    };
    
    var Graphs  = function(rawData){
        // this variable will have elements, and methods, to manipulate the graphical object
        var colWidth = '30px';
        var rowHeight = '20px';
        var dendrogram;
        var orderedMatrix;
        var variableSelection = d3.keys(rawData[0]);
        var identifierVar = variableSelection.shift(0);
        var matrix = rawData;
        var colorFunc = {};
        
        // for the statistical stuff
        var instanceSelection = rawData.map(function(row){ return escape(row[identifierVar]); });
    
        // transformations of the data
        variableSelection.map(function(varName){ colorData(varName, d3.rgb(225,255,221), d3.rgb(29,255,0)); });
    
        init();
    
        function init(){
            initTable();
            dendrogram = new Dendrogram();
            // now that the table is drawn, go for the dendrogram, of course, sync with the table itself
            makeVisualization();
            drawOptions();
            // Now we are done ;-)
        }
    
        function colorData(varName, min_color, max_color) {
            var bins = d3.set(matrix.map(function(row){ return row[varName]; }));
    
            // sort the bins for the look up table
            var binsOrdered = bins.values().sort(function(a,b){ return a-b; });
    
            // now create the color array for each of the binsOrdered
            colorFunc[varName] = function(value){ 
                var pos = binsOrdered.indexOf(value) / binsOrdered.length;
                return d3.interpolateRgb(min_color, max_color)(pos);
            };
        }
    
        function makeValueMatrix(dendrogram){
            // organizes the data into labels and a matrix useful for the dendrogram;
            dendrogram.x = [];
            dendrogram.labels = [];
    
            for (var i=0; i<matrix.length; i++) {
                var id = matrix[i][identifierVar];
                if (instanceSelection.indexOf(id) > -1){
                    dendrogram.labels.push(id);
                    dendrogram.x.push(variableSelection.map(function(varName){
                        return +matrix[i][varName];
                    }));
                }
            }
        }
        
        function initTable(){
            var container = d3.select('#left');
            if (container.select('table').empty())
                container.append('table');
    
            var headerColors = d3.range(0,1,1/(variableSelection.length+1))
                    .map(d3.interpolateRgb('rgb(0,200,200)','rgb(0,200,255)'));
            var tr = container.select('table').append('thead').append('tr').style('height',rowHeight);
            
            // first the id
            tr.append('th').style('width',colWidth).style('background-color',headerColors[0]).html(identifierVar);
    
            tr.selectAll('td').data(variableSelection)
                .enter().append('td').html(function(d){ return d; })
                .style('width',colWidth)
                .style('background-color',function(d,i){ return headerColors[i+1]; });
    
            // now the checkbox
            tr.selectAll('td').data(variableSelection)
                .append('input').attr('type','checkbox').attr('varName',function(d){ return d; }).attr('checked',true).on('change',function(){
                var target = d3.select(this);
                var varName = target.attr('varName');
    
                if (target.property('checked')){
                    // add the variable to the selection. Does the order matter?
                    variableSelection.push(varName);
                    makeVisualization();
                }else{
                    // recalculate the dendrogram, leaving this variable out; re-build table with the new order
                    variableSelection.splice(variableSelection.indexOf(varName),1);
                    if (variableSelection.length > 0){
                        makeVisualization();
                    }else{
                        // go back tot he original order in the table and clean the dendrogram
                        dendrogram.init();
                        orderTable(d3.range(matrix.length));
                    }
                }
            });
    
            drawDataTable();
        }
    
        function drawDataTable(){
            var tbody = d3.select('#left').select('table').append('tbody');
    
            tbody.selectAll('tr').data(matrix)
                .enter().append('tr').style('height',rowHeight)
                .selectAll('th').data(function(d){ return d3.entries(d).slice(0,1); })
                .enter().append('th').style('text-align','left')
                .append('input').attr('type','checkbox').attr('checked',true);
    
            tbody.selectAll('tr').data(matrix)
                .selectAll('th').append('span').html(function(d){ return d.value; });
    
            tbody.selectAll('tr').data(matrix)
                .selectAll('td').data(function(d){ return d3.entries(d).slice(1); })
                .enter().append('td').html(function(d){ return d.value; });
                //.style('background-color','rgb(255,255,255)').html('(no data)');
        }
        
        function orderTable(order){
            orderedMatrix = order.map(function(i){ return matrix[i]; });
    
            var tbody = d3.select('#left').select('tbody');
    
            tbody.selectAll('tr').data(orderedMatrix)
                .selectAll('input').data(function(d){ return d3.entries(d).slice(0,1); })
                .attr('type','checkbox')
                .attr('value',function(d){ return d.value; })
                .attr('checked',true)
                .on('change',function(){
                    var target = d3.select(this);
                    console.log(target.attr('value')+' was '+(target.property('checked') ? 'checked' : 'unchecked'));
                    if (target.property('checked')){
                        // recalculate the dendrogram; re-build table with the new order
                    }else{
                        // recalculate the dendrogram, leaving this variable out; re-build table with the new order
                    }
                });
    
            tbody.selectAll('tr').data(orderedMatrix)
                .selectAll('span').data(function(d){ return d3.entries(d).slice(0,1); })
                .html(function(d){ return d.value; });
    
            tbody.selectAll('tr').data(orderedMatrix)
                .selectAll('td').data(function(d){ return d3.entries(d).slice(1); })
                .html(function(d){ return d.value; })
                .style('background-color',function(d){ if (d.key in colorFunc) return colorFunc[d.key](d.value); });
                //.style('background-color','rgb(255,255,255)').html('(no data)');
    
        }
    
        function drawPdistTable(distMat, newOrder) {
            // we need an extra row, even if empty, 
            // to place this table in the sample position as the data heatmap
            var colormap = d3.interpolateRgb('rgb(255,255,255)','rgb(21,0,255)');
    
            // order the matrix according to the way the lines were re-ordered for the dendrogram
            var orderedSquare = newOrder.map(function(i){
                return newOrder.map(function(j){ return distMat[i][j]; })
            });
            // clear the previously created data, if exists
            d3.select('#pdist').remove();
            
            // make a table with the data;
            var dataTable = d3.select('#left').select('table');
            var table = d3.select('#middle').append('table').attr('id','pdist').style('height',dataTable.style('height'));
            var h = dataTable.select('thead').select('td').style('height');
            table.append('thead').append('tr')
                .append('td').style('height',h);
            
            var max = d3.max(distMat.map(function(x){ return d3.max(x); }));
            table.append('tbody').selectAll('tr').data(orderedSquare)
                .enter().append('tr').style('height',rowHeight)
                .selectAll('td').data(function(d){ return d; })
                .enter().append('td').style('min-width',h).html(function(d){ return d3.round(d,1); })
                .style('background-color',function(d){ return colormap(d/max); });
    
        }
    
        function drawOptions() {
            var options = d3.select('#options');
            options.append('div').append('label').html('Dendrogram options').style('font-weight','bold');
    
            var distance = options.append('div');
            distance.append('label').html('Distance metric');
            var select = distance.append('select')
                .on('change',function(){
                    dendrogram.metric = d3.select(this).property('value');
                    makeVisualization();
                });
    
            select.append('option').attr('value', 'euclidean').attr('selected','on').html('euclidean');
            select.append('option').attr('value', 'city block').html('city block');
            select.append('option').attr('value', 'correlation').html('correlation');
            select.append('option').attr('value', 'minkowski').html('minkowski');
    
            var linkage = options.append('div');
            linkage.append('label').html('Linkage method');
            select = linkage.append('select')
                .on('change',function(){
                    dendrogram.method = d3.select(this).property('value');
                    makeVisualization();
                });
    
            select.append('option').attr('value', 'average').attr('selected','on').html('average');
            select.append('option').attr('value', 'single').html('single');
            select.append('option').attr('value', 'complete').html('complete');
    
            var orient = options.append('div');
            orient.append('label').html('Dendrogram Orientation');
            select = orient.append('select')
                .on('change',function(){
                    dendrogram.orientation = d3.select(this).property('value');
                    makeVisualization();
                });
    
            select.append('option').attr('value', 'left').attr('selected','on').html('left');
            select.append('option').attr('value', 'right').html('right');
            select.append('option').attr('value', 'top').html('top');
            select.append('option').attr('value', 'bottom').html('bottom');
    
            var corrmatrix = options.append('div');
            corrmatrix.append('label').html('Correlation matrix heatmap');
            corrmatrix.append('input').attr('type','checkbox')
                .on('change',function(){
                    var display = d3.select(this).property('checked') ? 'block' : 'none';
                    d3.select('#middle').style('display',display);
                });        
        }
    
        function makeDendrogram() {
            var container = d3.select('#right');
            var dataTable = d3.select('#left').select('table');
            if (container.select('table').empty()){
                var table = container.append('table').style('height', dataTable.style('height'));
                table.append('thead').append('tr').append('th')
                    .style('height', dataTable.select('td').style('height'));
                table.append('tbody').append('tr').append('td');
            }
    
            dendrogram.init(container.select('td'), 250, parseInt(dataTable.select('tbody').style('height')));
    
            // data for the dendrogram
            makeValueMatrix(dendrogram);
    
            // finally draw the dendrogram!! 
            dendrogram.draw();
    
            return dendrogram;
        }
    
        function makeVisualization() {
            // make Dendrogram will happen every time a variable is unselected or re-selected
            makeDendrogram();
            
            // we are NOT done yet;
            // now we need to re-order the table according to the lines in the table to match the ones in the dendrogram
            orderTable(dendrogram.newGroups);
            drawPdistTable(dendrogram.D, dendrogram.newGroups);
        }
    };
  
	/* Wait for Agave to Bootstrap before executing our code. */
	window.addEventListener('Agave::ready', function() {
		var Agave = window.Agave;
		
		
		

		/* Function to create a nxn table with correlation coefficients for the genes in the pathway */
		var buildHeatMapTable = function buildHeatMapTable(interactions){
		
			  return  new Graphs(interactions);  
		}

		/* Function to get a list of candidate co-expressing genes */
		var buildCandidateList = function buildCandidateList(interactions){
			// TO DO
		}
	  
		/* Function to build the co-expression table (heatmap) and to search for other co-expressed genes
		 *	INPUT: an array of loci
		 * 	RESULT: populates the heatmap and the co-expressed genes table
		 */
		var searchCoExpression = function searchCoExpression(loci){
			// Prepare the object that will contain interactions
			var loci_objects = new Array(loci.length);
			for (var i = 0; i < loci.length; i++){
				loci_objects[i] = {locus: loci[i], interactions: []};
			}
			// Fetch the data from ATTED
			getCorrelations(loci_objects, 0);
		};
		
		/* Function to fetch co-expressing genes and corresponding correlation coëfficients from ATTED
		 *	INPUT:
		 * 		1) an array of objects: [{locus: locus_id, interactions: [{locus: locus_id, correlation: cor_coefficient}]}]
		 * 		2) a number indicating the index of the locus that should be searched in this iteration
		 *	RESULT: fills out the interactions array for each locus id.
		 */
		var getCorrelations = function getCorrelations(loci, locus_to_search){
			// Check if the requested index is out of bounds
			if (locus_to_search === loci.length){
				// All data has been fetched, call the next function
				console.log('complete!');
				console.log(loci);
			} else {
				console.log('getting correlations for locus ' + loci[locus_to_search].locus);
				var query = {
					locus: loci[locus_to_search].locus,
					relationship_type: 'correlation_coefficient',
					threshold: 0.7
				};
				Agave.api.adama.getStatus({}, function(resp) {
					if (resp.obj.status === 'success') {
						console.log('searching..');
						Agave.api.adama.search(
							{'namespace': 'aip', 'service': 'atted_coexpressed_by_locus_v0.1', 'queryParams': query},
							function(search){	
								console.log('search object:');
								console.log(search.obj.result);
								loci[locus_to_search].interactions = new Array(search.obj.result.length);
								for (var i = 0; i < loci[locus_to_search].interactions.length; i++){
									loci[locus_to_search].interactions[i] = {locus: search.obj.result[i].related_entity, correlation: search.obj.result[i].relationships[0].scores[0].correlation_coefficient};
								}
								
								getCorrelations(loci, locus_to_search + 1);
							}
						);
					}
				});
			}
		};


		// EXAMPLE
		var loci = ['AT1G42970', 'AT5G66570', 'AT1G06680'];
		searchCoExpression(loci);
		
		// TEST HEATMAP
		var data =  [
            {'PathwayGene':'AGI1','AGI1':'1','AGI2':'0.8','AGI3':'0.6','AGI4':'0.7','AGI5':'0.1'},
            {'PathwayGene':'AGI2','AGI1':'0.8','AGI2':'1','AGI3':'0.4','AGI4':'0.2','AGI5':'0.5'},
            {'PathwayGene':'AGI3','AGI1':'0.6','AGI2':'0.4','AGI3':'1','AGI4':'0.5','AGI5':'0.7'},
            {'PathwayGene':'AGI4','AGI1':'0.7','AGI2':'0.2','AGI3':'0.5','AGI4':'1','AGI5':'0.2'},
            {'PathwayGene':'AGI5','AGI1':'0.4','AGI2':'0.2','AGI3':'0.7','AGI4':'0.9','AGI5':'1'}
        ]
        var heatmapChart = buildHeatMapTable(data);
        
	});
	
	

})(window, jQuery,d3);
