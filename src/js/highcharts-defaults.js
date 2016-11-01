module.exports = {
	options: {
		chart: {
			type: 'bar',
			backgroundColor: null,
			plotBackgroundColor: null,
			style: {
				fontFamily: 'Open Sans',
				color: '#ffffff'
			}
		},
		tooltip: {
			enabled: false,
			style: {
				padding: 10,
				fontWeight: 'bold'
			}
		},
		title: false,
		subtitle: false,
		legend: {
			enabled: false
		},
		plotOptions: {
			series: {
				color: '#009966',
				animation: false,
				borderWidth: 0,
				dataLabels: {
					format: '{y} ha',
					enabled: true,
					color: '#ffffff'
				},
				marker: {
					symbol: 'circle'
				}
			}
		},
		yAxis: {
			labels: {
				style: {
					color: '#fff'
				}
			},
			gridLineColor: 'rgba(255,255,255,0.1)',
			visible: false
		},
		xAxis: {
			type: 'category',
			labels: {
				format: '{value}',
				style: {
					color: '#fff'
				}
			},
			gridLineColor: 'rgba(255,255,255,0.2)',
			visible: true,
			tickLength: 0
		},
		credits: {
			enabled: false
		}
	}
};
