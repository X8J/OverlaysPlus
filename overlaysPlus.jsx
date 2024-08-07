{
    var scriptName = "AETextures";
    var presetFolderPath = "C:/presetAETextures";
    var presetTextures = [];
    var customTextures = [];
    var customFolderPath = "";
    var uiElements = null;
    ensurePresetFolderExists();

    function loadTextures(folder, isPreset) {
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
                        buttons: Group { orientation:'row', alignment:['left', 'bottom'], \
                            retargetBtn: Button { text:'Retarget Folder', alignment:['left', 'bottom'], preferredSize:[100, 30] }, \
                            addBtn: Button { text:'Add Texture', alignment:['left', 'bottom'], preferredSize:[100, 30] }, \
                            importBtn: Button { text:'Import Texture', alignment:['left', 'bottom'], preferredSize:[100, 30] }, \
                        }, \
                    }";
        
        window.grp = window.add(res);
    
        uiElements = {
            textureList: window.grp.main.textureList,
            customTab: window.grp.tabs.customTab,
            presetTab: window.grp.tabs.presetTab,
            retargetBtn: window.grp.buttons.retargetBtn,
            addBtn: window.grp.buttons.addBtn,
            importBtn: window.grp.buttons.importBtn,
            previewImage: window.grp.main.preview.previewImage
        };

        function switchTab() {
            if (uiElements.customTab.value) {
                uiElements.retargetBtn.visible = true;
                uiElements.textureList.visible = true;
                uiElements.previewImage.visible = true;
                loadTextures(new Folder(customFolderPath), false);
            } else if (uiElements.presetTab.value) {
                uiElements.retargetBtn.visible = false;
                uiElements.textureList.visible = true;
                uiElements.previewImage.visible = true;
                loadTextures(new Folder(presetFolderPath), true);
            }
        }

        function addTexture() {
            var file = File.openDialog("Select an image file to add", "*.jpg;*.jpeg;*.png;*.bmp", false);
            if (file) {
                var targetFolder = uiElements.customTab.value ? new Folder(customFolderPath) : new Folder(presetFolderPath);
                ensurePresetFolderExists();
                
                if (!targetFolder.exists) {
                    targetFolder.create();
                }
        
                var targetFile = new File(targetFolder.fsName + "/" + file.name);
        
                if (targetFile.exists && !confirm("File already exists. Do you want to overwrite it?")) {
                    return;
                }
        
                if (file.copy(targetFile)) {
                    loadTextures(targetFolder, uiElements.presetTab.value);
                    alert("Texture added successfully.");
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
                var textureLibraryFolder = app.project.items.addFolder("TextureLibrary");
                var importOptions = new ImportOptions(file);
                var importedItem = app.project.importFile(importOptions);
                importedItem.parentFolder = textureLibraryFolder;
                
                var activeComp = app.project.activeItem;
                if (activeComp && activeComp instanceof CompItem) {
                    var selectedLayers = activeComp.selectedLayers;
                    if (selectedLayers.length > 0) {
                        var selectedLayer = selectedLayers[0];
                        var selectedLayerDuration = selectedLayer.outPoint - selectedLayer.inPoint;
                        var newLayer = activeComp.layers.add(importedItem);
                        newLayer.moveBefore(selectedLayer);
                        newLayer.startTime = selectedLayer.startTime;
                        newLayer.inPoint = selectedLayer.inPoint;
                        newLayer.outPoint = newLayer.inPoint + selectedLayerDuration;
                    } else {
                        alert("Please select a layer in the composition before importing.");
                    }
                } else {
                    alert("Texture imported successfully. Please open a composition and select a layer to add the texture to the comp.");
                }
            } else {
                alert("No active project. Please open a project before importing textures.");
            }
        }

        customFolderPath = loadSettings();
        loadTextures(new Folder(presetFolderPath), true);
        if (customFolderPath) loadTextures(new Folder(customFolderPath), false);

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

        window.onResizing = window.onResize = function () {
            window.layout.resize();
            var previewWidth = window.grp.main.size.width - uiElements.textureList.size.width - 10;
            var previewHeight = window.grp.main.size.height - 10;
            uiElements.previewImage.size = [previewWidth, previewHeight];
            
            window.layout.layout(true);
        };

        window.layout.layout(true);
        if (customTextures.length > 0) {
            uiElements.textureList.selection = 0;
        }

        return window;
    }

    function loadSettings() {
        var settingsFile = new File(Folder.userData.fsName + "/TextureLibrarySettings.json");
        if (settingsFile.exists) {
            settingsFile.open('r');
            var data = JSON.parse(settingsFile.read());
            settingsFile.close();
            return data.customFolderPath || "";
        }
        return "";
    }

    var myScriptPal = buildUI(this);
    if (myScriptPal instanceof Window) {
        myScriptPal.center();
        myScriptPal.show();
    } else {
        myScriptPal.layout.layout(true);
    }
}
