/*jshint camelcase: false*/



(function(window, $, undefined) {
	'use strict';
	var appContext = $('[data-app-name="pathway-coexpression-illustrator"]');
  
	/* Wait for Agave to Bootstrap before executing our code. */
	window.addEventListener('Agave::ready', function() {
		var Agave = window.Agave;
		var correlation_threshold = 0.85;

		/* Function to create a nxn table with correlation coefficients for the genes in the pathway */
		var buildHeatMapTable = function buildHeatMapTable(interactions){
			// TO DO
			return interactions;
		};

		/* Function to get a list of candidate co-expressing genes */
		var buildCandidateList = function buildCandidateList(interactions){
			console.log('Building candidate list');
			// Build a map of the query loci
			var queryLoci = new Array(interactions.length);
			var i;
			var j;
			for (i = 0; i < queryLoci.length; i++){
				queryLoci[interactions[i].locus] = true;
			}
			console.log(queryLoci);
			
			var candidateLoci = new Array(interactions.length);
			for (i = 0; i < interactions.length; i++){
				for (j = 0; j < interactions[i].interactions.length; j++){
					if (queryLoci[interactions[i].interactions[j].locus]){
						continue;
					}
					if (!candidateLoci[interactions[i].interactions[j].locus]){
						candidateLoci[interactions[i].interactions[j].locus] = [];
					}
					candidateLoci[interactions[i].interactions[j].locus][candidateLoci[interactions[i].interactions[j].locus].length] = {query: interactions[i].locus, correlation: interactions[i].interactions[j].correlation};
				}
			}
			console.log(candidateLoci);
			var averageCorrelations = new Array(candidateLoci.length);
			var counter = 0;
			for (var candidateLocus in candidateLoci){
				var total = 0.0;
				for (i = 0; i < candidateLoci[candidateLocus].length; i++){
					total += candidateLoci[candidateLocus][i].correlation;
				}
				averageCorrelations[counter++] = {locus: candidateLocus, average: total / candidateLoci[candidateLocus].length};
			}
			averageCorrelations.sort(function(a, b){return b.average - a.average;});
			console.log(averageCorrelations);

			var table_html = '<table class="candidatesTable"><thead><th>Candidate Locus</th><th>Interaction partners</th><th>Average correlation</th></thead><tbody>';
			for (i = 0; i < averageCorrelations.length; i++){
				table_html += '<tr><td>' + averageCorrelations[i].locus + '</td><td>';
				for (j = 0; j < candidateLoci[averageCorrelations[i].locus].length; j++){
					if (j > 0){
						table_html += ', ';
					}
					table_html += candidateLoci[averageCorrelations[i].locus][j].query + ': ' + candidateLoci[averageCorrelations[i].locus][j].correlation;
				}
				table_html += '</td><td>' + averageCorrelations[i].average + '</td></tr>';				
			}
			table_html += '</tbody></table>';
			$('.candidate_gene_table', appContext).html(table_html);
			$('.candidatesTable', appContext).dataTable({
			  'order': [[ 2, 'desc' ]]
			});

			/*
			var templates = {
				resultTable: _.template('<table class="table"><thead><th>Candidate Locus</th><th>Interaction partners</th><th>Average correlation</th></thead><tbody><% _.each(result, function(r) { %><%= resultRow(r) %><% }); %></tbody></table>'),
				resultRow: _.template('<% for (var i = 0; i < relationships.length; i++) { %><tr><% if (i === 0) { %><td rowspan="<%= relationships.length %>"><%= related_entity %> </td><% } %><td><%= relationships[i].direction %></td><td><% _.each(relationships[i].scores, function(score){ %><%= _.values(score)[0] %><% }); %></td></tr><% } %>'),
				geneReport: _.template('<div class="modal fade"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><button type="button" data-dismiss="modal" class="close"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button><h4>Gene Report: <%= locus %></h4></div><div class="modal-body"><% _.each(properties, function(prop) { %><h3><%= prop.type.replace("_"," ") %></h3><p><%= prop.value %></p><% }) %></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>')
			};
			*/
			
			console.log('done');
		};

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
				buildCandidateList(loci);
				buildHeatMapTable(loci);
			} else {
				console.log('getting correlations for locus ' + loci[locus_to_search].locus);
				var query = {
					locus: loci[locus_to_search].locus,
					relationship_type: 'correlation_coefficient',
					threshold: correlation_threshold
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

		var loci = ['AT1G42970', 'AT5G66570', 'AT1G06680'];
		searchCoExpression(loci);
	});

})(window, jQuery);
