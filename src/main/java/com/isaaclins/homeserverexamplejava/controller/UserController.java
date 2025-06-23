package com.isaaclins.homeserverexamplejava.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class UserController {

    @GetMapping("/{id}")
    public String getId(@PathVariable String id, Model model) {
        model.addAttribute("userId", id);
        return "user";
    }

}
