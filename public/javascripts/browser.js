var scale = 1.0;
var tar_scale;
$(function(){
	setInterval("blink()",1500);

	
    var loc = location.href;
    if (loc.search("url=") != -1) {
        var init_url = location.search.replace("?url=", "");
        set_url(init_url);
    }
    
    
    $("#url_area").keyup(function(e){
        if (e.keyCode == 13) {
            set_url($(this).val());
            // hit_main_url();
        
        }
    });
    
    $("#search_area").keyup(function(e){
        if (e.keyCode == 13) {
            set_search($(this).val());
        }
    });
    
    $("#back_btn").click(function(){
        history.back();
    });
    $("#reload_btn").click(function(){
        location.reload();
    });
    
    $("#buttons").hover(function(){
        $(this).css({
            "opacity": 1.0
        })
    }, function(){
        $(this).css({
            "opacity": 0.0
        })
    });
    
    $("#close_btn").click(function(){
        setTimeout("win_close()", "2000");
        
        $("#screen").hide();
    });
    $("#minimize_btn").click(function(){
    
        tar_scale = 0.05;
        scaling();
        
    });
    var strUA = navigator.userAgent.toLowerCase();
    $("#maximize_btn").click(function(){
        tar_scale = 1.5;
        scaling();
        
    });
    
    $("#cloud_form").submit(function(){
        var set_url = $('#cloud_url').val();
        location.href = "http://okikata.org/study/test29/" + "?url=" + set_url;
    })
    
    
    $(".man").toggle(function(){
        $("#cloud_0").fadeIn(300, function(){
            $("#cloud_1").fadeIn(300, function(){
                $("#cloud_2").fadeIn(300, function(){
                    $("#main_cloud").fadeIn(300);
                })
            })
        })
    }, function(){
        $("#main_cloud").fadeOut(100, function(){
            $("#cloud_2").fadeOut(100, function(){
                $("#cloud_1").fadeOut(100, function(){
                    $("#cloud_0").fadeOut(100);
                })
            })
        })
    })
  
   
    
});


var b_c=0;
function blink(){
	var result = $('#main_cloud').is(':visible');
	if(!result){
		if(b_c==0){
	 		$("#me").fadeIn(200);
		}else{
			$("#me").fadeOut(200);
		}
		b_c++;
		if(b_c > 1){
		b_c = 0;
		}
	}else{
	$("#me").fadeOut(200);
	}
}

function scaling(){
    scale += (tar_scale - scale) / 2;
    $("#screen").css({
        "-webkit-transform": "scale(" + scale + ") skew(0deg, -20deg)",
        "-moz-transform": "scale(" + scale + ") skew(0deg, -20deg)"
    
    })
    var timer = setTimeout("scaling()", 5);
    
    if (Math.abs(tar_scale - scale) < 0.01) {
        clearTimeout(timer);
    }
}

function win_close(){
    window.opener = window;
    var win = window.open(location.href, "_self");
    win.close();
}

function set_url(_text){
    if (_text.search("http://") == -1&&_text.search("https://") == -1) {
        _text = "http://" + _text;
    }
    $("#url_area").val(_text);
    
    $("#screen_area").attr({
        src: _text
    })
    //var iframe_url=screen_area.location.href;
   $("#preload").attr({
    	src:"http://capture.heartrails.com/400x400?http://okikata.org/study/test29/?url="+_text
    })
    $("#shoot").attr({
    	href:"http://capture.heartrails.com/400x400?http://okikata.org/study/test29/?url="+_text
    })
}

function set_search(_text){
    if ($("#search_area").focus()) {
        $("#search_area").val(_text);
        $("#screen_area").attr({
            src: "http://search.yahoo.co.jp/search?p=" + _text
        })
        $("#url_area").val("http://search.yahoo.co.jp/search?p=" + _text);
    }
    
}

function set_focus(){
    $("#search_area").focus();
}

window.onload = function(){
    setTimeout("set_focus()", 1000);
//    $("iframe").contents().find('html').css("zoom","0.4");

    
}


