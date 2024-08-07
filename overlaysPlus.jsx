// script name and paths
var scriptName = "OverlaysPlus";
var presetFolderPath = "C:/presetAETextures";
var presetTextures = [];
var customTextures = [];
var customFolderPath = "";
var uiElements = null;
var showVideoFiles = false;

// load textures from a folder
function loadTextures(folder, isPreset) {
    var textures = folder.getFiles(function (file) {
        var fileExtensions = showVideoFiles ? 
            /\.(jpg|jpeg|png|bmp|mp4|mov|avi)$/i : 
            /\.(jpg|jpeg|png|bmp)$/i;
        return file instanceof File && fileExtensions.test(file.name);
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

// ensure the preset folder exists
function ensurePresetFolderExists() {
    var folder = new Folder(presetFolderPath);
    if (!folder.exists) {
        folder.create();
    }
}

// build the user interface
function buildUI(thisObj) {
    var window = (thisObj instanceof Panel) ? thisObj : new Window("palette", scriptName, undefined, {resizeable: true});
    var res = "group { \
        orientation:'column', alignment:['fill', 'fill'], \
        header: Group { orientation:'row', alignment:['fill', 'top'], \
            title: StaticText { text:'" + scriptName + "', alignment:['fill', 'center'] }, \
        }, \
        tabs: Group { orientation:'row', alignment:['fill', 'top'], \
            customTab: RadioButton { text:'Custom Overlays', alignment:['left', 'top'], value:true }, \
            presetTab: RadioButton { text:'Preset Overlays', alignment:['left', 'top'] }, \
        }, \
        main: Group { orientation:'row', alignment:['fill', 'fill'], \
            textureList: ListBox { alignment:['left', 'fill'], preferredSize:[150, -1], properties:{multiselect:false, scrollable:true} }, \
            preview: Group { orientation:'column', alignment:['fill', 'fill'], \
                previewImage: Image { alignment:['fill', 'fill'], preferredSize:[300, 300] }, \
            }, \
        }, \
        buttons: Group { orientation:'row', alignment:['left', 'bottom'], \
            retargetBtn: Button { text:'Retarget Folder', alignment:['left', 'bottom'], preferredSize:[100, 30] }, \
            addBtn: Button { text:'Add Overlay', alignment:['left', 'bottom'], preferredSize:[100, 30] }, \
            importBtn: Button { text:'Import Overlay', alignment:['left', 'bottom'], preferredSize:[100, 30] }, \
            toggleVideoBtn: Button { text:'Show Videos', alignment:['left', 'bottom'], preferredSize:[100, 30] }, \
            openVideoBtn: Button { text:'Open Video', alignment:['left', 'bottom'], preferredSize:[100, 30], visible:false }, \
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
        toggleVideoBtn: window.grp.buttons.toggleVideoBtn,
        openVideoBtn: window.grp.buttons.openVideoBtn,
        previewImage: window.grp.main.preview.previewImage
    };

    customFolderPath = loadSettings();
    
    if (customFolderPath) {
        loadTextures(new Folder(customFolderPath), false);
        uiElements.customTab.value = true;
        uiElements.presetTab.value = false;
    } else {
        loadTextures(new Folder(presetFolderPath), true);
        uiElements.customTab.value = false;
        uiElements.presetTab.value = true;
    }

    // switch between custom and preset tabs
    function switchTab() {
        var isCustomTab = uiElements.customTab.value;
        uiElements.retargetBtn.visible = isCustomTab;
        loadTextures(new Folder(isCustomTab ? customFolderPath : presetFolderPath), !isCustomTab);
    }

    // add a new texture to the library
    function addTexture() {
        var file = File.openDialog("Select an image or video file to add", "*.jpg;*.jpeg;*.png;*.bmp;*.mp4;*.mov;*.avi", false);
        if (file) {
            var targetFolder = new Folder(uiElements.customTab.value ? customFolderPath : presetFolderPath);
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

    // import the selected texture into the project
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

    // import a texture file into the after effects project
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

    // select a new folder for custom textures
    function selectFolder() {
        var folder = Folder.selectDialog("Select a folder for custom textures");
        if (folder) {
            customFolderPath = folder.fsName;
            saveSettings();
            loadTextures(folder, false);
            uiElements.customTab.value = true;
            uiElements.presetTab.value = false;
        }
    }

    // toggle visibility of video files in the texture list
    function toggleVideoFiles() {
        showVideoFiles = !showVideoFiles;
        uiElements.toggleVideoBtn.text = showVideoFiles ? "Hide Videos" : "Show Videos";
        uiElements.openVideoBtn.visible = showVideoFiles;
        loadTextures(new Folder(uiElements.customTab.value ? customFolderPath : presetFolderPath), uiElements.presetTab.value);
    }

    // open the selected video file
    function openVideo() {
        var selectedTexture = uiElements.customTab.value ? 
            customTextures[uiElements.textureList.selection.index] : 
            presetTextures[uiElements.textureList.selection.index];
        
        if (selectedTexture && /\.(mp4|mov|avi)$/i.test(selectedTexture.name)) {
            selectedTexture.execute();
        } else {
            alert("Please select a video file to open.");
        }
    }

    uiElements.customTab.onClick = switchTab;
    uiElements.presetTab.onClick = switchTab;
    uiElements.retargetBtn.onClick = selectFolder;
    uiElements.addBtn.onClick = addTexture;
    uiElements.importBtn.onClick = importTexture;
    uiElements.toggleVideoBtn.onClick = toggleVideoFiles;
    uiElements.openVideoBtn.onClick = openVideo;
    
    uiElements.textureList.onChange = function () {
        var selectedTexture = uiElements.customTab.value ? 
            customTextures[this.selection.index] : 
            presetTextures[this.selection.index];
        if (selectedTexture) {
            if (/\.(mp4|mov|avi)$/i.test(selectedTexture.name)) {
                uiElements.previewImage.image = null;
                uiElements.previewImage.text = "Video preview not supported, open video with button";
            } else {
                uiElements.previewImage.image = selectedTexture;
                uiElements.previewImage.text = "";
            }
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

// load user settings
function loadSettings() {
    var settingsFile = new File(Folder.userData.fsName + "/TextureLibrarySettings.json");
    if (settingsFile.exists) {
        settingsFile.open('r');
        var content = settingsFile.read();
        settingsFile.close();
        try {
            var data = JSON.parse(content);
            return data.customFolderPath || "";
        } catch (e) {
            return "";
        }
    }
    return "";
}

// save user settings
function saveSettings() {
    var settingsFile = new File(Folder.userData.fsName + "/TextureLibrarySettings.json");
    settingsFile.open('w');
    var data = JSON.stringify({customFolderPath: customFolderPath});
    settingsFile.write(data);
    settingsFile.close();
}

ensurePresetFolderExists();
var myScriptPal = buildUI(this);
if (myScriptPal instanceof Window) {
    myScriptPal.center();
    myScriptPal.show();
} else {
    myScriptPal.layout.layout(true);
}
