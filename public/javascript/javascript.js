var fillPlaces = function(places){
	var select = $('.stops');
	var places = places.map(function(each){
		return '<option>'+each+'</option>';
	});
	select.html(places);
};

var renderTable = function(buses){
	var table = $('#data');
	var str = '<tr><th>Bus Number</th><th>Goes Through</th></tr>';	
	for(var i in buses){
		str += '<tr><td>'+i+'</td>'+'<td>'+buses[i]+'</td>'+'</tr>'
	}
	table.html(str);
};

var getShortest = function(from, to){
	$.post('getShortest','from='+from+'&to='+to,function(data, status){
		if(status == 'success'){
			renderTable(JSON.parse(data));
		};
	});
};	

var find = function(from, to){
	$.post('findOtherPaths','from='+from+'&to='+to,function(data, status){
		if(status == 'success'){
			if(Object.keys(JSON.parse(data)).length == 0){
				getShortest(from, to);
			}else{
				renderTable(JSON.parse(data))
			}
		};
	});
};

$(document).ready(function(){
	$.get('places',function(data, status){
		if(status == 'success'){
			fillPlaces(JSON.parse(data));
		};
	});
	var getPath = $('button');
	getPath.on('click',function(){
		find($('#from').val(), $('#to').val());
	});
});