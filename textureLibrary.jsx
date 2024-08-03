{
    var scriptName = "Texture Library with Preview";
    var presetFolderPath = "C:/presetAETextures"; // use forward slashes for path
    var presetTextures = [];
    var customTextures = [];
    var customFolderPath = "";
    var uiElements = null; // references to ui el
    ensurePresetFolderExists();

    

    function loadTextures(folder, isPreset) {
        if (isPreset) {
            ensurePresetFolderExists();
        }
        
        var textures = folder.getFiles(function (file) {
            return file instanceof File && /\.(jpg|jpeg|png|bmp)$/i.test(file.name);
        });
    
        if (uiElements && uiElements.textureList) {
            uiElements.textureList.removeAll();
            for (var i = 0; i < textures.length; i++) {
                uiElements.textureList.add("item", textures[i].name);
            }
        }
    
        if (isPreset) {
            presetTextures = textures;
        } else {
            customTextures = textures;
        }
    }

    function ensurePresetFolderExists() {
        var folder = new Folder(presetFolderPath);
        if (!folder.exists) {
            var success = folder.create();
            if (success) {
                alert("Preset textures folder created at: " + presetFolderPath);
            } else {
                alert("Failed to create preset textures folder at: " + presetFolderPath);
            }
        }
    }

    function buildUI(thisObj) {
        var window = (thisObj instanceof Panel) ? thisObj : new Window("palette", scriptName, undefined, { resizeable: true });
        var res = "group { \
                        orientation:'column', alignment:['fill', 'fill'], \
                        header: Group { orientation:'row', alignment:['fill', 'top'], \
                            title: StaticText { text:'" + scriptName + "', alignment:['fill', 'center'] }, \
                        }, \
                        tabs: Group { orientation:'row', alignment:['fill', 'top'], \
                            customTab: RadioButton { text:'Custom Textures', alignment:['left', 'top'], value:true }, \
                            presetTab: RadioButton { text:'Preset Textures', alignment:['left', 'top'] }, \
                        }, \
                        main: Group { orientation:'row', alignment:['fill', 'fill'], \
                            textureList: ListBox { alignment:['left', 'fill'], preferredSize:[150, -1], properties:{multiselect:false, scrollable:true} }, \
                            preview: Group { orientation:'column', alignment:['fill', 'fill'], \
                                previewImage: Image { alignment:['fill', 'fill'], preferredSize:[300, 300] }, \
                            }, \
                        }, \
                        buttons: Group { orientation:'row', alignment:['center', 'bottom'], \
                            retargetBtn: Button { text:'Retarget Folder', alignment:['center', 'bottom'], preferredSize:[100, 30] }, \
                            addBtn: Button { text:'Add Texture', alignment:['center', 'bottom'], preferredSize:[100, 30] }, \
                            importBtn: Button { text:'Import Texture', alignment:['center', 'bottom'], preferredSize:[100, 30] }, \
                        }, \
                    }";
        
        window.grp = window.add(res);

        // store ref for ui 
        uiElements = {
            textureList: window.grp.main.textureList,
            customTab: window.grp.tabs.customTab,
            presetTab: window.grp.tabs.presetTab,
            retargetBtn: window.grp.buttons.retargetBtn,
            addBtn: window.grp.buttons.addBtn,
            importBtn: window.grp.buttons.importBtn,
            previewImage: window.grp.main.preview.previewImage
        };

        function selectFolder() {
            var folder = Folder.selectDialog("Select the folder containing your textures");
            if (folder) {
                customFolderPath = folder.fsName;
                loadTextures(folder, false);
                saveSettings(); // save new custom folderp ath
            }
        }

        function switchTab() {
            if (uiElements.customTab.value) {
                uiElements.retargetBtn.visible = true;
                if (customFolderPath) {
                    loadTextures(new Folder(customFolderPath), false);
                } else {
                    selectFolder();
                }
            } else {
                uiElements.retargetBtn.visible = false;
                loadTextures(new Folder(presetFolderPath), true);
            }
        }

        function addTexture() {
            var file = File.openDialog("Select an image file to add", "*.jpg;*.jpeg;*.png;*.bmp", false);
            if (file) {
                var targetFolder;
                if (uiElements.customTab.value) {
                    targetFolder = new Folder(customFolderPath);
                } else {
                    ensurePresetFolderExists();
                    targetFolder = new Folder(presetFolderPath);
                }
                
                if (!targetFolder.exists) {
                    targetFolder.create();
                }
        
                var targetFile = new File(targetFolder.fsName + "/" + file.name);
        
                if (targetFile.exists) {
                    var overwrite = confirm("File already exists. Do you want to overwrite it?");
                    if (!overwrite) {
                        return;
                    }
                }
        
                if (file.copy(targetFile)) {
                    loadTextures(targetFolder, uiElements.presetTab.value);
                    alert("Texture added successfully to the folder.");
                } else {
                    alert("Failed to copy file.");
                }
            }
        }

        function importTexture() {
            var selectedTexture = uiElements.customTab.value ? 
                customTextures[uiElements.textureList.selection.index] : 
                presetTextures[uiElements.textureList.selection.index];
            
            if (selectedTexture) {
                importTextureToProject(selectedTexture);
            } else {
                alert("Please select a texture to import.");
            }
        }
        function importTextureToProject(file) {
            if (app.project) {
                var textureLibraryFolder = null;
                
                // check if texturelibrary exists if not make it
                for (var i = 1; i <= app.project.numItems; i++) {
                    if (app.project.item(i) instanceof FolderItem && app.project.item(i).name === "TextureLibrary") {
                        textureLibraryFolder = app.project.item(i);
                        break;
                    }
                }
                
                if (!textureLibraryFolder) {
                    textureLibraryFolder = app.project.items.addFolder("TextureLibrary");
                }
                
                // import texture to tL folder
                var importOptions = new ImportOptions(file);
                var importedItem = app.project.importFile(importOptions);
                importedItem.parentFolder = textureLibraryFolder;
                
                // check if active comp and selected layer
                var activeComp = app.project.activeItem;
                if (activeComp && activeComp instanceof CompItem) {
                    var selectedLayers = activeComp.selectedLayers;
                    if (selectedLayers.length > 0) {
                        var selectedLayer = selectedLayers[0];
                        
                        // calculate length of layer
                        var selectedLayerDuration = selectedLayer.outPoint - selectedLayer.inPoint;
                        
                        // add texture to comp
                        var newLayer = activeComp.layers.add(importedItem);
                        
                        // move layer above selected
                        newLayer.moveBefore(selectedLayer);
                        
                        // match in point and duration to selected
                        newLayer.startTime = selectedLayer.startTime;
                        newLayer.inPoint = selectedLayer.inPoint;
                        newLayer.outPoint = newLayer.inPoint + selectedLayerDuration;
                        
                        //alert("Texture imported successfully into TextureLibrary folder and added to the composition.");
                    } else {
                        alert("Please select a layer in the composition before importing.");
                    }
                } else {
                    alert("Texture imported successfully into TextureLibrary folder. Please open a composition and select a layer to add the texture to the comp.");
                }
            } else {
                alert("No active project. Please open a project before importing textures.");
            }
        }

        // load the saved custom folder path
        customFolderPath = loadSettings();

        if (customFolderPath) {
            loadTextures(new Folder(customFolderPath), false);
        } else {
            selectFolder();
        }
        loadTextures(new Folder(presetFolderPath), true);

       
        uiElements.customTab.onClick = switchTab;
        uiElements.presetTab.onClick = switchTab;
        uiElements.retargetBtn.onClick = selectFolder;
        uiElements.addBtn.onClick = addTexture;
        uiElements.importBtn.onClick = importTexture;

        uiElements.textureList.onChange = function () {
            var selectedTexture = uiElements.customTab.value ? 
                customTextures[this.selection.index] : 
                presetTextures[this.selection.index];
            if (selectedTexture) {
                uiElements.previewImage.image = new File(selectedTexture.fsName);
            }
        };

        window.layout.layout(true);
        if (customTextures.length > 0) {
            uiElements.textureList.selection = 0;
        }

        return window;
    }

    var myScriptPal = buildUI(this);
    if (myScriptPal instanceof Window) {
        myScriptPal.center();
        myScriptPal.show();
    } else {
        myScriptPal.layout.layout(true);
    }
}
