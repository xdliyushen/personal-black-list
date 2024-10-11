import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import './index.scss';

const PageTime = () => {
    const chartRef = useRef(null);
    const [data, setData] = useState([
        { name: 'Category A', value: 120, expanded: false, children: [{ name: 'Page 1', value: 60 }, { name: 'Page 2', value: 60 }] },
        { name: 'Category B', value: 200, expanded: false, children: [{ name: 'Page 3', value: 100 }, { name: 'Page 4', value: 100 }] }
    ]);

    const getChartData = () => {
        let labels = [];
        let values = [];
        data.forEach(item => {
            labels.push(item.name);
            // 如果展开，则添加子项的值
            if (item.expanded) {
                item.children.forEach(child => {
                    labels.push(`  ${child.name}`); // 添加缩进以区分子项
                    values.push(child.value);
                });
            } else {
                values.push(item.value);
            }
        });
        return { labels, values };
    };

    const renderChart = () => {
        const { labels, values } = getChartData();
        const myChart = echarts.init(chartRef.current);

        const option = {
            tooltip: {},
            yAxis: {
                type: 'category',
                data: labels,
            },
            xAxis: {
                type: 'value',
            },
            series: [{
                type: 'bar',
                data: values,
                itemStyle: {
                    normal: {
                        color: '#4caf50'
                    }
                }
            }]
        };

        myChart.setOption(option);
        myChart.on('click', (params) => {
            const index = params.dataIndex;

            // 处理点击，展开或折叠
            if (data[index].children) {
                const newData = [...data];
                newData[index].expanded = !newData[index].expanded;
                setData(newData); // 更新数据
            }
        });
    };

    useEffect(() => {
        renderChart();
    }, [data]); // 每当 data 更新时重新渲染图表

    return (
        <div>
            <div ref={chartRef} style={{ width: '600px', height: '400px' }}></div>
        </div>
    );
};

export default PageTime;
