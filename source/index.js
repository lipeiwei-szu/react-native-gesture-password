import * as helper from './helper'
import React from 'react'
import { StyleSheet, PanResponder, View, Text, Dimensions, ViewPropTypes, Image } from 'react-native'
import Line from './line'
import Circle from './circle'
import PropTypes from 'prop-types'
import GesturePasswordStatus from './gesturePasswordStatus'

const Width = Dimensions.get('window').width
const Radius = Width / 10

export default class GesturePassword extends React.Component {
  constructor(props) {
    super(props)

    this.timer = null
    this.lastIndex = -1
    this.sequence = '' // 手势结果
    this.isMoving = false

		const { circleRadius, circleMargin, horizontalMargin } = props
    // getInitialState
    let circles = []
    for (let i = 0; i < 9; i++) {
      let p = i % 3
      let q = parseInt(i / 3)
      circles.push({
        isActive: false,
        x: p * (circleRadius * 2 + circleMargin) + horizontalMargin + circleRadius,
        y: q * (circleRadius * 2 + circleMargin) + circleRadius
      })
    }

    this.state = {
      circles: circles,
      lines: []
    }
    // {x, y, width, height}
    this.containerLayout = {}
    this.boardLayout = {}
    this.onBoardLayout = this.onBoardLayout.bind(this)
    this.onContainerLayout = this.onContainerLayout.bind(this)
    this.getLocationY = this.getLocationY.bind(this)
    this.getLineStyle = this.getLineStyle.bind(this)
    this.renderLines = this.renderLines.bind(this)
  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      // 要求成为响应者：
      onStartShouldSetPanResponder: (event, gestureState) => true,
      onStartShouldSetPanResponderCapture: (event, gestureState) => true,
      onMoveShouldSetPanResponder: (event, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (event, gestureState) => true,

      // 开始手势操作
      onPanResponderGrant: (event, gestureState) => {
        this.onStart(event, gestureState)
      },
      // 移动操作
      onPanResponderMove: (event, gestureState) => {
        this.onMove(event, gestureState)
      },
      // 释放手势
      onPanResponderRelease: (event, gestureState) => {
        this.onEnd(event, gestureState)
      }
    })
  }

  render() {
    const { status, wrongColor, rightColor, style, textStyle, message } = this.props
		const color = status === GesturePasswordStatus.WRONG  ? wrongColor : rightColor
    return (
      <View style={[styles.container, style]} onLayout={this.onContainerLayout}>
        <View style={styles.msgContainer}>
          <Text style={[styles.msgText, textStyle, {color: color}]}>
            {message}
          </Text>
        </View>
        <View
          style={styles.board}
          onLayout={this.onBoardLayout}
          {...this._panResponder.panHandlers}
        >
          {this.renderCircles()}
          {this.renderLines()}
          <Line ref="line" style={this.getLineStyle()} />
        </View>
      </View>
    )
  }

  renderCircles() {
    let array = [], fill, color, inner, outer, style
    let { status, normalColor, wrongColor, rightColor, innerCircle, outerCircle, circleRadius,
			normalCircleStyle, selectedCircleStyle, wrongCircleStyle } = this.props

    this.state.circles.forEach(function(c, i) {
      fill = c.isActive
      color = status === GesturePasswordStatus.WRONG ? wrongColor : rightColor
      inner = !!innerCircle
      outer = !!outerCircle
			if (c.isActive) {
      	if (status === GesturePasswordStatus.WRONG) {
      		style = wrongCircleStyle
				} else {
      		style = selectedCircleStyle
				}
			} else {
      	style = normalCircleStyle
			}

      array.push(
        <Circle
          key={'c_' + i}
          fill={fill}
          normalColor={normalColor}
          color={color}
          x={c.x}
          y={c.y}
          r={circleRadius}
          inner={inner}
          outer={outer}
					style={style}
        />
      )
    })

    return array
  }

  renderLines() {
    let array = [], color
    let { status, wrongColor, rightColor } = this.props

    this.state.lines.forEach((l, i) => {
      color = status === GesturePasswordStatus.WRONG ? wrongColor : rightColor
      array.push(<Line key={'l_' + i} color={color} start={l.start} end={l.end} style={this.getLineStyle()} />)
    })
    return array
  }

  setActive(index) {
    this.state.circles[index].isActive = true

    let circles = this.state.circles
    this.setState({ circles })
  }

  resetActive() {
    this.state.lines = []
    for (let i = 0; i < 9; i++) {
      this.state.circles[i].isActive = false
    }

    let circles = this.state.circles
    this.setState({ circles })
    this.props.onReset && this.props.onReset()
  }

  getTouchChar(touch) {
  	const { circleRadius } = this.props
    let x = touch.x
    let y = touch.y

    for (let i = 0; i < 9; i++) {
      if (helper.isPointInCircle({ x, y }, this.state.circles[i], circleRadius)) {
        return String(i)
      }
    }

    return false
  }

  getCrossChar(char) {
    let middles = '13457', last = String(this.lastIndex)

    if (middles.indexOf(char) > -1 || middles.indexOf(last) > -1) return false

    let point = helper.getMiddlePoint(this.state.circles[last], this.state.circles[char])

    for (let i = 0; i < middles.length; i++) {
      let index = middles[i]
      if (helper.isEquals(point, this.state.circles[index])) {
        return String(index)
      }
    }

    return false
  }

  onStart(event, g) {
    let x = event.nativeEvent.pageX
    let y = this.getLocationY(event.nativeEvent.pageY)

    let lastChar = this.getTouchChar({ x, y })
    if (lastChar) {
      this.isMoving = true
      this.lastIndex = Number(lastChar)
      this.sequence = lastChar
      this.resetActive()
      this.setActive(this.lastIndex)

      let point = {
        x: this.state.circles[this.lastIndex].x,
        y: this.state.circles[this.lastIndex].y
      }

      this.refs.line.setNativeProps({ start: point, end: point })

      this.props.onStart && this.props.onStart()

      if (this.props.interval > 0) {
        clearTimeout(this.timer)
      }
    }
  }

  onMove(event, g) {
  	const { circleRadius } = this.props
    let x = event.nativeEvent.pageX
    let y = this.getLocationY(event.nativeEvent.pageY)

    if (this.isMoving) {
      this.refs.line.setNativeProps({ end: { x, y } })

      let lastChar = null

      if (!helper.isPointInCircle({ x, y }, this.state.circles[this.lastIndex], circleRadius)) {
        lastChar = this.getTouchChar({ x, y })
      }

      if (lastChar && this.sequence.indexOf(lastChar) === -1) {
        if (!this.props.allowCross) {
          let crossChar = this.getCrossChar(lastChar)

          if (crossChar && this.sequence.indexOf(crossChar) === -1) {
            this.sequence += crossChar
            this.setActive(Number(crossChar))
          }
        }

        let lastIndex = this.lastIndex
        let thisIndex = Number(lastChar)

        this.state.lines.push({
          start: {
            x: this.state.circles[lastIndex].x,
            y: this.state.circles[lastIndex].y
          },
          end: {
            x: this.state.circles[thisIndex].x,
            y: this.state.circles[thisIndex].y
          }
        })

        this.lastIndex = Number(lastChar)
        this.sequence += lastChar

        this.setActive(this.lastIndex)

        let point = {
          x: this.state.circles[this.lastIndex].x,
          y: this.state.circles[this.lastIndex].y
        }

        this.refs.line.setNativeProps({ start: point })
      }
    }

    if (this.sequence.length === 9) this.onEnd()
  }

  onEnd(e, g) {
    if (this.isMoving) {
      let password = helper.getRealPassword(this.sequence)
      this.sequence = ''
      this.lastIndex = -1
      this.isMoving = false

      let origin = { x: 0, y: 0 }
      this.refs.line.setNativeProps({ start: origin, end: origin })

      this.props.onEnd && this.props.onEnd(password)

      if (this.props.interval > 0) {
        this.timer = setTimeout(() => this.resetActive(), this.props.interval)
      }
    }
  }

  onBoardLayout(evt) {
    this.boardLayout = evt.nativeEvent.layout
    console.log(`boardLayout信息 = ${JSON.stringify(evt.nativeEvent.layout)}`)
  }

  onContainerLayout(evt) {
    this.containerLayout = evt.nativeEvent.layout
    console.log(`containerLayout信息 = ${JSON.stringify(evt.nativeEvent.layout)}`)
  }

  getLocationY(pageY) {
    return pageY - this.containerLayout.y - this.boardLayout.y - (this.props.navBarHeight || 0)
  }

  getLineStyle() {
  	const { status, wrongLineStyle, normalLineStyle } = this.props
		return status === GesturePasswordStatus.WRONG ? wrongLineStyle : normalLineStyle
	}
}

GesturePassword.propTypes = {
  message: PropTypes.string,
  normalColor: PropTypes.string,
  rightColor: PropTypes.string,
  wrongColor: PropTypes.string,
  status: PropTypes.oneOf([GesturePasswordStatus.NORMAL, GesturePasswordStatus.RIGHT, GesturePasswordStatus.WRONG]),
  onStart: PropTypes.func,
  onEnd: PropTypes.func,
  onReset: PropTypes.func,
  interval: PropTypes.number,
  allowCross: PropTypes.bool,
  innerCircle: PropTypes.bool,
  outerCircle: PropTypes.bool,
	navBarHeight: PropTypes.number,
	// circle style
	normalCircleStyle: ViewPropTypes.style,
  selectedCircleStyle: ViewPropTypes.style,
	wrongCircleStyle: ViewPropTypes.style,
  // circle image
  selectedCircleImage: Image.propTypes.source,
  wrongCircleImage: Image.propTypes.source,
  // line style
  normalLineStyle: ViewPropTypes.style,
  wrongLineStyle: ViewPropTypes.style,
  circleRadius: PropTypes.number,
  circleMargin: PropTypes.number,
  // 整体左右侧的间距
  horizontalMargin: PropTypes.number,
	// todo onChange
}

GesturePassword.defaultProps = {
  message: '',
  normalColor: '#5FA8FC',
  rightColor: '#5FA8FC',
  wrongColor: '#D93609',
  status: GesturePasswordStatus.NORMAL,
  interval: 0,
  allowCross: false,
  innerCircle: true,
  outerCircle: true
}

const styles = StyleSheet.create({
  container: {
  },
  board: {
    width: Width,
		// todo
    // height: Radius * 8
  },
  msgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40
  },
  msgText: {
    fontSize: 14
  }
})

module.exports = GesturePassword
