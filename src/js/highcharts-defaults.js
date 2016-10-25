module.exports = {
	options: {
		chart: {
			type: 'spline',
			backgroundColor: null,
			plotBackgroundColor: null,
			style: {
				fontFamily: 'Open Sans',
				color: '#ffffff'
			}
		},
		tooltip: {
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
				color: '#f26969'
			}
		},
		yAxis: {
			labels: {
				style: {
					color: '#fff'
				}
			},
			gridLineColor: 'rgba(255,255,255,0.1)'
		},
		xAxis: {
			labels: {
				style: {
					color: '#fff'
				}
			}
		},
		credits: {
			enabled: false
		}
	}
};
