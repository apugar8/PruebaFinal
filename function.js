require(["esri/Map", "esri/views/MapView", "esri/layers/FeatureLayer", "esri/widgets/Popup", "esri/PopupTemplate", "esri/rest/support/Query", "esri/layers/GraphicsLayer", "esri/widgets/LayerList", "esri/widgets/Sketch", "esri/widgets/Sketch/SketchViewModel"], (Map, MapView, FeatureLayer, Popup, PopupTemplate, Query, GraphicsLayer, LayerList, Sketch, SketchViewModel) => {

    const mapa = new Map({
        basemap: "gray-vector"
    })

    const vista = new MapView({
        container: "viewDiv",
        map: mapa,
        center: [-3.7038, 40.4168],
        zoom: 5.5,
    })


    // Definimos simbología para la capa de Red Natura 2000 a partir del campo "Tipo"

    let simbolos = {
        type: "unique-value",
        field: "Tipo",
        defaultSymbol: {
            type: "simple-fill",
        },

        uniqueValueInfos: [{

            value: "LIC",
            symbol: {
                type: "simple-fill",
                color: "#cbf3f0cc",
                outline: {
                    color: "black",
                    width: 0.5
                }
            }

        }, {

            value: "ZEPA",
            symbol: {
                type: "simple-fill",
                color: "#ffbf69cc",
                outline: {
                    color: "black",
                    width: 0.5
                }
            }

        }]

    }

    const capaRedNatura = new FeatureLayer({
        url: "https://services1.arcgis.com/nCKYwcSONQTkPA4K/arcgis/rest/services/Red_Natura_2000/FeatureServer",
        renderer: simbolos,
    })

    mapa.add(capaRedNatura)

    const capaPlayas = new FeatureLayer({
        url: "https://services1.arcgis.com/nCKYwcSONQTkPA4K/arcgis/rest/services/Playas_2015/FeatureServer",
        effect: "bloom(2, 0.5px,0.0)"
    })

    mapa.add(capaPlayas)


    // Añadimos el widget Popup

    const ventana = new Popup({
        dockEnabled: true,
        dockOptions: {
            breakpoint: false,
            position: "bottom-left",
        }
    })

    vista.popup = ventana 

    const plantilla = new PopupTemplate({
        title: "{Nombre}",
        content: [{
            type: "fields",
            fieldInfos: [
                {fieldName: "Descripci", label: "Descripción"},
                {fieldName: "Longitud", label: "Longitud de la playa"},
                {fieldName: "Anchura", label: "Anchura de la playa"},
                {fieldName: "Condicione", label: "Condición de la playa"},
            ]
        }]
    })

    capaPlayas.popupTemplate = plantilla 


    // Hacemos una consulta para que cambie la simbología de las playas que en las que sí se puede bucear

    const parametrosQuery = new Query({
        where: "Submarinis = 'Sí'",
        outFields: ["*"],
        returnGeometry: true

    })

    const capaSubmarinismo = new GraphicsLayer()

    capaPlayas.queryFeatures(parametrosQuery).then((resultado) => {

        let submarinismoFeatures = resultado.features.map((submarinismo) => {  
            submarinismo.symbol = {
                type: "picture-marker",
                url: "https://cdn-icons-png.freepik.com/512/196/196660.png",
                width: "30px",
                height: "30px"
            }

            return submarinismo
        })

        capaSubmarinismo.addMany(submarinismoFeatures)

        mapa.add(capaSubmarinismo)

    })


    // Añadimos el widget LayerList

    const lista = new LayerList({
        view: vista
    })

    vista.ui.add(lista, {
        position: "bottom-left"
        
    })


    // Añadimos el widget Sketch

    const capaSketch = new GraphicsLayer()

    const sketch = new Sketch({
        layer: capaSketch,
        view: vista,
        defaultCreateOptions: {
            mode: "hybrid",
            polygonSymbol: {
                type: "simple-fill",
                color: "purple",
                style: "cross",
                outline: {
                    color: "green",
                    width: 3
                }
            },
            pointSymbol: {
                type: "simple-marker",
                color: "blue",
                outline: {
                    color: "white",
                    width: 3
                }   
            },
            polylineSymbol: {
                type: "simple-line",
                color: "gold",
                width: 3
            },
            snappingOptions: {
                enabled: true,
            }
        }
    })

    mapa.add(capaSketch);

    vista.ui.add(sketch, {
        position: "top-right",
    })


    // Añadimos un evento para que al crear un polígono, se seleccione las áreas de Red Natura 2000 que intersecten con el polígono. Debemos asegurarnos con "event.tool" que la herramienta que se está utilizando es "polygon"

    sketch.on("create", function(event) {

        if (event.state === "complete") {
            let geometry = event.graphic.geometry
    
            if (event.tool === "polygon") {
                let query = capaRedNatura.createQuery()

                query.geometry = geometry
                query.spatialRelationship = "intersects"

                capaRedNatura.queryFeatures(query).then(function(result) {
                    result.features.forEach(function(feature) {
                        feature.symbol = {
                            type: "simple-fill",
                            color: "#00fffc",
                            outline: {
                                color: [255, 255, 255],
                                width: 1
                            }
                        }

                        capaSketch.add(feature)
                        
                    })
                })
            }
        }
    })


    // Añadimos un evento para que al hacer click en el botón "Limpiar selección", se borren las entidades seleccionadas al intersecar con el polígono

    document.getElementById('limpiarSeleccion').addEventListener('click', function() {
        capaSketch.removeAll()
    })
})