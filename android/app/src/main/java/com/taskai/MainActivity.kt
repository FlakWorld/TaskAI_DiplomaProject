package com.taskai

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    private var initialIntent: Intent? = null

    override fun getMainComponentName(): String = "TaskAI"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        // Сохраняем исходный intent перед вызовом super.onCreate()
        initialIntent = intent
        super.onCreate(savedInstanceState)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let {
            handleDeepLink(it)
            setIntent(it) // Критически важно для react-native-app-auth
        }
    }

    private fun handleDeepLink(intent: Intent) {
        intent.data?.let { uri ->
            println("Handling deep link: $uri")
            // Добавьте обработку специфичных параметров если нужно
        }
    }

    override fun onResume() {
        super.onResume()
        initialIntent?.let {
            handleDeepLink(it)
            initialIntent = null
        }
    }
}