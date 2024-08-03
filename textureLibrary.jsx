{
    var scriptName = "Texture Library with Preview";
    var presetFolderPath = "C:/Users/vikwa/Downloads/splinter/splinter"; // use forward slashes for path
    var presetTextures = [];
    var customTextures = [];
    var customFolderPath = "";

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
                            applyBtn: Button { text:'Import Texture', alignment:['center', 'bottom'], preferredSize:[100, 30] }, \
                        }, \
                    }";
        
        window.grp = window.add(res);
        
        function loadTextures(folder, isPreset) {
            var textures = folder.getFiles(function (file) {
                return file instanceof File && /\.(jpg|jpeg|png|bmp)$/i.test(file.name);
            });

            window.grp.main.textureList.removeAll();
            for (var i = 0; i < textures.length; i++) {
                window.grp.main.textureList.add("item", textures[i].name);
            }

            if (isPreset) {
                presetTextures = textures;
            } else {
                customTextures = textures;
            }
        }

        function selectFolder() {
            var folder = Folder.selectDialog("Select the folder containing your textures");
            if (folder) {
                customFolderPath = folder.fsName;
                loadTextures(folder, false);
            } else {
                alert("No folder selected.");
            }
        }

        function switchTab() {
            if (window.grp.tabs.customTab.value) {
                window.grp.buttons.retargetBtn.visible = true;
                if (customFolderPath) {
                    loadTextures(new Folder(customFolderPath), false);
                } else {
                    selectFolder();
                }
            } else {
                window.grp.buttons.retargetBtn.visible = false;
                loadTextures(new Folder(presetFolderPath), true);
            }
        }

      
        selectFolder();

       
        loadTextures(new Folder(presetFolderPath), true);

        window.grp.tabs.customTab.onClick = switchTab;
        window.grp.tabs.presetTab.onClick = switchTab;
        window.grp.buttons.retargetBtn.onClick = selectFolder;

        window.grp.main.textureList.onChange = function () {
            var selectedTexture = window.grp.tabs.customTab.value ? 
                customTextures[this.selection.index] : 
                presetTextures[this.selection.index];
            if (selectedTexture) {
                window.grp.main.preview.previewImage.image = new File(selectedTexture.fsName);
            }
        };

        window.grp.buttons.applyBtn.onClick = function () {
            var selectedTexture = window.grp.tabs.customTab.value ? 
                customTextures[window.grp.main.textureList.selection.index] : 
                presetTextures[window.grp.main.textureList.selection.index];
            if (selectedTexture) {
                app.beginUndoGroup("Import Texture");
                app.project.importFile(new ImportOptions(File(selectedTexture)));
                app.endUndoGroup();
            } else {
                alert("Please select a texture to import.");
            }
        };

        window.layout.layout(true);
        if (customTextures.length > 0) {
            window.grp.main.textureList.selection = 0;
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
