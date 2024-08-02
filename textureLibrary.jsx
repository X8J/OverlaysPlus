{
    var scriptName = "AEtextures";

    function buildUI(thisObj) {
        var window = (thisObj instanceof Panel) ? thisObj : new Window("palette", scriptName, undefined, { resizeable: true });
        var res = "group { \
                        orientation:'column', alignment:['fill', 'fill'], \
                        header: Group { orientation:'row', alignment:['fill', 'top'], \
                            title: StaticText { text:'" + scriptName + "', alignment:['fill', 'center'] }, \
                        }, \
                        main: Group { orientation:'row', alignment:['fill', 'fill'], \
                            textureList: ListBox { alignment:['left', 'fill'], preferredSize:[150, -1], properties:{multiselect:false, scrollable:true} }, \
                            preview: Group { orientation:'column', alignment:['fill', 'fill'], \
                                previewImage: Image { alignment:['fill', 'fill'], preferredSize:[300, 300] }, \
                            }, \
                        }, \
                        buttons: Group { orientation:'row', alignment:['center', 'bottom'], \
                            applyBtn: Button { text:'Import Texture', alignment:['center', 'bottom'], preferredSize:[100, 30] }, \
                        }, \
                    }";
        
        window.grp = window.add(res);

        //prompt texture fold
        var textureFolder = Folder.selectDialog("Select the folder containing your textures");
        if (textureFolder) {
            var textures = textureFolder.getFiles(function (file) {
                return file instanceof File && /\.(jpg|jpeg|png|bmp)$/i.test(file.name);
            });

            // what the heck
            for (var i = 0; i < textures.length; i++) {
                window.grp.main.textureList.add("item", textures[i].name);
            }

            // update preview
            window.grp.main.textureList.onChange = function () {
                var selectedTexture = textures[this.selection.index];
                if (selectedTexture) {
                    window.grp.main.preview.previewImage.image = new File(selectedTexture.fsName);
                }
            };

            // apply texture
            window.grp.buttons.applyBtn.onClick = function () {
                var selectedTexture = textures[window.grp.main.textureList.selection.index];
                if (selectedTexture) {
                    app.beginUndoGroup("Import Texture");
                    app.project.importFile(new ImportOptions(File(selectedTexture)));
                    app.endUndoGroup();
                } else {
                    alert("Please select a texture to import.");
                }
            };

          
            window.layout.layout(true);
            if (textures.length > 0) {
                window.grp.main.textureList.selection = 0;
            }
        } else {
            alert("No folder selected. Script will now exit.");
            window.close();
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
