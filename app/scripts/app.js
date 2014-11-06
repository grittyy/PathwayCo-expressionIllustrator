/*jshint camelcase: false*/



(function(window, $, undefined) {
	'use strict';
	//var appContext = $('[data-app-name="workshop-tutorial-app"]');	
  
	/* Wait for Agave to Bootstrap before executing our code. */
	window.addEventListener('Agave::ready', function() {
		var Agave = window.Agave;

		/* Function to create a nxn table with correlation coefficients for the genes in the pathway */
		var buildHeatMapTable = function buildHeatMapTable(interactions){
			// TO DO
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
	});

})(window, jQuery);
