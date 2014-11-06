# Pathway Co-expression Illustrator

An AIP-workshop idea app. Given a gene locus, display the pathways it is involved in and give the co-expression of genes in that pathway and other genes co-expressed with them.

An [AIP](http://www.araport.org) Science App created using [Yeoman](http://yeoman.io)
and the [AIP science app generator](https://www.npmjs.org/package/generator-aip-science-app).

## Authors
  * Dries Vaneechoulte
  * Stephen Ficklin
  * Umit Seren
  * Sergio Contino
  * Chuan Wang

## GUI:

```
[ Locus Text Box ]
---------------------------------------------------------------------
[ Pathway Drop Down ]             |           HEAT MAP
----------------------------------|
                                  |
                                  |
                                  |
       Cytoscape Viewer           |
                                  |
                                  |
---------------------------------------------------------------------


     Genes Not in Pathway Co-Expressed with Pathway Genes


---------------------------------------------------------------------
```

## Steps:

1. User provides single locus ID  
2. Call pathway_by_locus service  
    a. JSON is parsed to get the list of reactions  
3. Select the first pathway  
    a. For each reaction in the pathway    
        i. Call the loci_of_reaction service and parse the JSON to retrieve the list of genes in the reaction    
        ii. Call the atted_webservice to retrieve the co-expression information for each of genes in the list constructed in step 3.a.i  
    b. Separate the gene list from step 3.a into two lists:    
        i. Get co-expression data from genes in the pathway (will be used for heat map construction)    
        ii. Get co-expression data from genes not in the pathway (will be used for table)  
    c. Generate the Cytoscape JSON file for constructing the network view  
4. Visualization  
    a. Network View:  pass the Cytoscape JSON to the Cytoscape.js plugin  
    b. Heat Map:  
    c. Co-expressed Genes Table:  Construct the data table (perhaps using underscore library).  
5. If user selects a different pathway, repeat step 3 but with the pathway frameid selected.  
